const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const PDL_API_KEY = process.env.PDL_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PDL_BASE_URL = 'https://api.peopledatalabs.com/v5/person/search';

// Function to convert natural language to PDL query
async function convertToPDLQuery(naturalText) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a search query parser that converts natural language queries into People Data Labs (PDL) search parameters. 
                        Output only valid JSON without any explanation. The JSON should follow this format:
                        {
                            "query": {
                                "bool": {
                                    "must": []
                                }
                            },
                            "size": 10
                        }
                        Parse job titles, years of experience, companies, industries, and locations into appropriate PDL query parameters.
                        Use these field mappings:
                        - job_title for job titles
                        - inferred_years_experience for experience
                        - job_company_name for company name
                        - job_company_size for company size

                        job_company_size is an enum the options are below:
                        1-10
                        11-50
                        51-200
                        201-500
                        501-1000
                        1001-5000
                        5001-10000
                        10001+

                        - job_company_industry for industry
                        job_company_industry is an enum with these options:
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

                        startup always refers to job_company_size and it will be 
                        1-10 and 11-50 and 51-200
                        `
                    },
                    {
                        role: "user",
                        content: naturalText
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Extract the actual query JSON from the OpenAI response
        const pdlQuery = JSON.parse(response.data.choices[0].message.content);
        return pdlQuery;
    } catch (error) {
        console.error('Error in OpenAI conversion:', error);
        throw error;
    }
}

// New endpoint to handle natural language search
app.post('/api/natural-search', async (req, res) => {
    try {
        const { text } = req.body;

        console.log(text)
        
        // First, convert natural language to PDL query
        const pdlQuery = await convertToPDLQuery(text);

        console.log("this is the pdlQuery", JSON.stringify(pdlQuery))
        
        // Then use that query to search PDL
        const pdlResponse = await axios.post(PDL_BASE_URL, pdlQuery, {
            headers: {
                'X-API-Key': PDL_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            pdlQuery: pdlQuery,
            ...pdlResponse.data
        });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data
            });
        }
        res.status(500).json({
            error: {
                message: 'An internal server error occurred',
                details: error.message
            }
        });
    }
});

// Keep your existing PDL search endpoint
app.post('/api/search', async (req, res) => {
    try {
        const searchParams = req.body;
        console.log("these are the search params", JSON.stringify(searchParams))
        const response = await axios.post(PDL_BASE_URL, searchParams, {
            headers: {
                'X-API-Key': PDL_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data
            });
        }
        res.status(500).json({
            error: {
                message: 'An internal server error occurred',
                details: error.message
            }
        });
    }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});