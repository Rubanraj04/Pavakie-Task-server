const Groq = require('groq-sdk');

// Lazy initialization of Groq client (only when needed and API key is available)
let groq = null;

function getGroqClient() {
  // Only initialize if API key is available
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  
  // Initialize on first use
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  
  return groq;
}

/**
 * Process search query using Groq AI to extract keywords, intent, and improve search
 * @param {string} searchText - The raw search text from user
 * @returns {Promise<Object>} - Processed search terms with keywords, intent, and improved query
 */
async function processSearchQuery(searchText) {
  try {
    if (!searchText || searchText.trim() === '') {
      return {
        originalQuery: searchText,
        processedQuery: '',
        keywords: [],
        intent: 'general',
        useAI: false
      };
    }

    // Get Groq client (only if API key is available)
    const groqClient = getGroqClient();
    if (!groqClient) {
      // Fallback to direct search if Groq is not available
      return {
        originalQuery: searchText,
        processedQuery: searchText,
        keywords: extractKeywords(searchText),
        intent: 'general',
        useAI: false
      };
    }

    // Optimized prompt for faster processing
    const prompt = `Extract job search info from: "${searchText}"

Return JSON only:
{"keywords":["term1","term2"],"skills":["skill1"],"jobTitle":"title or null","jobLevel":"entry|mid|senior or null","intent":"brief","improvedQuery":"refined query","searchTerms":["term1"]}`;

    // Use faster model with optimized settings
    const completion = await groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. Extract keywords, skills, job title, level, intent, and refined query from job searches.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-8b-instant', // Fastest model
      temperature: 0.1, // Lower temperature for faster, more consistent responses
      max_tokens: 150, // Reduced tokens for faster response
      stream: false
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from Groq');
    }

    // Parse JSON response - handle cases where JSON might be wrapped in markdown code blocks
    let parsedResponse;
    try {
      // Try direct parsing first
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      // If that fails, try extracting JSON from markdown code blocks
      const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       responseContent.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Unable to parse JSON from Groq response');
      }
    }

    return {
      originalQuery: searchText,
      processedQuery: parsedResponse.improvedQuery || searchText,
      keywords: parsedResponse.keywords || [],
      skills: parsedResponse.skills || [],
      jobTitle: parsedResponse.jobTitle || null,
      jobLevel: parsedResponse.jobLevel || null,
      intent: parsedResponse.intent || 'general',
      searchTerms: parsedResponse.searchTerms || [],
      useAI: true
    };

  } catch (error) {
    console.error('Groq AI processing error:', error.message);
    // Fallback to direct search
    return {
      originalQuery: searchText,
      processedQuery: searchText,
      keywords: extractKeywords(searchText),
      intent: 'general',
      useAI: false,
      error: error.message
    };
  }
}

/**
 * Extract keywords from text (fallback method)
 * @param {string} text - Text to extract keywords from
 * @returns {Array<string>} - Array of keywords
 */
function extractKeywords(text) {
  if (!text) return [];
  
  // Remove common stop words and extract meaningful words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Build MongoDB query from processed search data
 * @param {Object} processedData - Processed search data from Groq
 * @param {Object} existingQuery - Existing query object
 * @returns {Object} - Enhanced MongoDB query
 */
function buildEnhancedQuery(processedData, existingQuery = {}) {
  const query = { ...existingQuery };
  
  if (!processedData || !processedData.useAI) {
    // Fallback to simple regex search
    if (processedData?.processedQuery) {
      query.$or = [
        { title: { $regex: processedData.processedQuery, $options: 'i' } },
        { description: { $regex: processedData.processedQuery, $options: 'i' } },
        { company: { $regex: processedData.processedQuery, $options: 'i' } },
      ];
    }
    return query;
  }

  // Build enhanced query using AI-processed data
  const searchConditions = [];
  
  // Use improved query for broad search
  if (processedData.processedQuery) {
    searchConditions.push(
      { title: { $regex: processedData.processedQuery, $options: 'i' } },
      { description: { $regex: processedData.processedQuery, $options: 'i' } },
      { company: { $regex: processedData.processedQuery, $options: 'i' } }
    );
  }
  
  // Add keyword-based search
  if (processedData.keywords && processedData.keywords.length > 0) {
    processedData.keywords.forEach(keyword => {
      searchConditions.push(
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      );
    });
  }
  
  // Add job title search if extracted
  if (processedData.jobTitle) {
    searchConditions.push({ title: { $regex: processedData.jobTitle, $options: 'i' } });
  }
  
  // Add skills search if extracted
  if (processedData.skills && processedData.skills.length > 0) {
    // Add skills to search conditions
    processedData.skills.forEach(skill => {
      searchConditions.push({ skills: { $in: [new RegExp(skill, 'i')] } });
    });
  }

  if (searchConditions.length > 0) {
    query.$or = (query.$or || []).concat(searchConditions);
  }
  
  // Add job level filter if extracted
  if (processedData.jobLevel) {
    const levelMap = {
      'entry': { $lte: 2 },
      'mid': { $gte: 2, $lte: 5 },
      'senior': { $gte: 5, $lte: 10 },
      'executive': { $gte: 10 }
    };
    
    if (levelMap[processedData.jobLevel]) {
      query.experience = levelMap[processedData.jobLevel];
    }
  }

  return query;
}

module.exports = {
  processSearchQuery,
  buildEnhancedQuery,
  extractKeywords
};

