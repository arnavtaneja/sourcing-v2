import React, { useState } from 'react';
import { Search, Building2, Briefcase, MapPin, Mail, Linkedin } from 'lucide-react';

const MultiSelect = ({ options, value, onChange, placeholder }) => (
  <div className="relative">
    <select
      multiple
      value={value}
      onChange={e => onChange([...e.target.selectedOptions].map(opt => opt.value))}
      className="w-full rounded-lg border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
    {value.length > 0 && (
      <button
        onClick={() => onChange([])}
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
        type="button"
      >
        Clear
      </button>
    )}
  </div>
);

const PDLSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [minYearsExp, setMinYearsExp] = useState('');
  const [maxYearsExp, setMaxYearsExp] = useState(''); // New state for max years of experience
  const [location, setLocation] = useState(''); // New state for location search
  const [scrollToken, setScrollToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [naturalSearchText, setNaturalSearchText] = useState('');
  const [error, setError] = useState(null); // Add error state

  const INDUSTRIES = [
    "computer software",
    "information technology and services",
    "financial services",
    "banking",
    "healthcare",
    "marketing and advertising",
    "telecommunications",
    "consulting",
    "education",
    "retail",
    "insurance",
    "real estate",
    "automotive",
    "entertainment",
    "pharmaceuticals",
    "construction",
    "hospitality",
    "manufacturing",
    "media",
    "e-commerce"
  ];

  const JOB_LEVELS = [
    "intern",
    "entry",
    "senior",
    "manager",
    "director",
    "vp",
    "cxo",
    "owner"
  ];

  const COMPANY_SIZES = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001-5000",
    "5001-10000",
    "10001+"
  ];

  const handleSearch = async (e, isLoadingMore = false) => {
    e?.preventDefault();
    setLoading(true);
    setError(null); // Clear any previous errors

    const formData = isLoadingMore ? null : new FormData(e.target);
    const searchParams = {
      query: {
        bool: {
          must: []
        }
      },
      size: 10
    };

    // Add scroll token if loading more
    if (isLoadingMore && scrollToken) {
      searchParams.scroll_token = scrollToken;
    } else {
      // Clear previous results if this is a new search
      setSearchResults([]);
      setScrollToken(null);
    }

    // Add job title
    const jobTitle = isLoadingMore ? document.getElementById('jobTitle').value : formData.get('jobTitle');
    if (jobTitle) {
      searchParams.query.bool.must.push({
        match: { "job_title": jobTitle }
      });
    }

    // Add company name
    const companyName = isLoadingMore ? document.getElementById('companyName').value : formData.get('companyName');
    if (companyName) {
      searchParams.query.bool.must.push({
        match: { "job_company_name": companyName }
      });
    }

    // Add industries
    if (selectedIndustries.length) {
      searchParams.query.bool.must.push({
        terms: { "job_company_industry": selectedIndustries }
      });
    }

    // Add job levels
    if (selectedLevels.length) {
      searchParams.query.bool.must.push({
        terms: { "job_title_levels": selectedLevels }
      });
    }

    // Add company sizes
    if (selectedSizes.length) {
      searchParams.query.bool.must.push({
        terms: { "job_company_size": selectedSizes }
      });
    }

    // Add minimum years of experience if specified
    if (minYearsExp !== '') {
      searchParams.query.bool.must.push({
        range: {
          "inferred_years_experience": {
            gte: parseInt(minYearsExp)
          }
        }
      });
    }

    // Add location search if specified
    if (location) {
      searchParams.query.bool.must.push({
        match: {
          "location_name": location
        }
      });
    }

    // Add maximum years of experience if specified
    if (maxYearsExp !== '') {
      searchParams.query.bool.must.push({
        range: {
          "inferred_years_experience": {
            lte: parseInt(maxYearsExp)
          }
        }
      });
    }

    try {
      const response = await fetch('http://localhost:8081/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });
      
      const data = await response.json();
      
      if (data.data) {
        setSearchResults(prev => isLoadingMore ? [...prev, ...data.data] : data.data);
        setScrollToken(data.scroll_token);
        setHasMore(!!data.scroll_token);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNaturalSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
        const response = await fetch('http://localhost:8081/api/natural-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: naturalSearchText }),
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'Error in search');
        }

        // Extract values from the PDL query if it exists
        if (data.pdlQuery?.query?.bool?.must) {
            const esQuery = data.pdlQuery.query.bool.must;
            
            // Reset all form values first
            setSelectedIndustries([]);
            setSelectedLevels([]);
            setSelectedSizes([]);
            setMinYearsExp('');
            setMaxYearsExp('');
            setLocation('');
            document.getElementById('jobTitle').value = '';
            document.getElementById('companyName').value = '';

            // Map ES query fields to UI fields
            esQuery.forEach(clause => {
                // Handle simple match queries
                if (clause.match) {
                    Object.entries(clause.match).forEach(([field, value]) => {
                        switch (field) {
                            case 'job_title':
                                document.getElementById('jobTitle').value = value;
                                break;
                            case 'job_company_name':
                                document.getElementById('companyName').value = value;
                                break;
                            case 'location_name':
                                setLocation(value);
                                break;
                            case 'job_company_industry':
                                setSelectedIndustries([value]); // Handle single industry match
                                break;
                        }
                    });
                } 
                // Handle terms queries (for company size and industry)
                else if (clause.terms) {
                    Object.entries(clause.terms).forEach(([field, values]) => {
                        switch (field) {
                            case 'job_company_size':
                                setSelectedSizes(values);
                                break;
                            case 'job_company_industry':
                                setSelectedIndustries(values);
                                break;
                        }
                    });
                }
                // Handle nested bool queries (alternative format for company size)
                else if (clause.bool?.should) {
                    const sizes = clause.bool.should
                        .filter(item => item.match?.job_company_size)
                        .map(item => item.match.job_company_size);
                    if (sizes.length > 0) {
                        setSelectedSizes(sizes);
                    }
                }
                // Handle range queries
                else if (clause.range) {
                    Object.entries(clause.range).forEach(([field, range]) => {
                        if (field === 'inferred_years_experience') {
                            if (range.gte) setMinYearsExp(range.gte.toString());
                            if (range.lte) setMaxYearsExp(range.lte.toString());
                        }
                    });
                }
            });
        }

        // Set search results
        if (data.data) {
            setSearchResults(data.data);
            setScrollToken(data.scroll_token);
            setHasMore(!!data.scroll_token);
        }
    } catch (error) {
        console.error('Error:', error);
        setError(error.message || 'An error occurred during search. Please try again.');
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">PDL Recruiter Search</h1>
          <p className="mt-2 text-lg text-gray-600">Find the perfect candidates for your roles</p>
        </div>

                {/* Add Natural Language Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Natural Language Search</h2>
          <form onSubmit={handleNaturalSearch}>
            <div className="relative">
              <input
                type="text"
                value={naturalSearchText}
                onChange={(e) => setNaturalSearchText(e.target.value)}
                placeholder="Try: PM with 5 years of XP and has worked at a startup"
                className="w-full rounded-lg border border-gray-300 pl-4 pr-12 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="jobTitle"
                    name="jobTitle"
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="location"
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. New York, NY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="companyName"
                    name="companyName"
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Google"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <MultiSelect
                  options={INDUSTRIES}
                  value={selectedIndustries}
                  onChange={setSelectedIndustries}
                  placeholder="Select industries"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Level
                </label>
                <MultiSelect
                  options={JOB_LEVELS}
                  value={selectedLevels}
                  onChange={setSelectedLevels}
                  placeholder="Select job levels"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </label>
                <MultiSelect
                  options={COMPANY_SIZES}
                  value={selectedSizes}
                  onChange={setSelectedSizes}
                  placeholder="Select company sizes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minYearsExp}
                  onChange={(e) => setMinYearsExp(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 shadow-sm p-2"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxYearsExp}
                  onChange={(e) => setMaxYearsExp(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 shadow-sm p-2"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Search className="mr-2 h-4 w-4" />
                  Search Candidates
                </span>
              )}
            </button>
          </form>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <div className="space-y-6">
              {searchResults.map((person, index) => (
                <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{person.full_name || 'N/A'}</h3>
                      <p className="text-sm text-gray-600">{person.job_title || 'N/A'}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {person.inferred_years_experience} years exp
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="mr-2 h-4 w-4" />
                      {person.job_company_name || 'N/A'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="mr-2 h-4 w-4" />
                      {person.location_name || 'N/A'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="mr-2 h-4 w-4" />
                      {person.work_email || 'N/A'}
                    </div>
                    {person.linkedin_url && (
                      <div className="flex items-center text-sm text-blue-600">
                        <Linkedin className="mr-2 h-4 w-4" />
                        <a href={person.linkedin_url.startsWith('http') ? person.linkedin_url : `https:/${person.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {person.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {person.skills.slice(0, 5).map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={(e) => handleSearch(e, true)}
                  disabled={loading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More Results'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDLSearch;