const pdfParse = require('pdf-parse');
const natural = require('natural');

async function extractKeywordsFromResume(buffer, mimeType) {
  let text = '';

  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      // For DOC/DOCX files, we'll need a different parser
      // For now, return empty array or implement a text extraction library
      // You could use 'mammoth' for DOCX files
      text = ''; // Placeholder - would need additional library
    }

    if (!text) {
      return [];
    }

    // Extract keywords using NLP
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());

    if (!tokens || tokens.length === 0) {
      return [];
    }

    // Filter common stop words and short words
    const stopWords = new Set(natural.stopwords);
    const keywords = tokens
      .filter(token => token.length > 3 && !stopWords.has(token))
      .filter(token => /^[a-z]+$/i.test(token)) // Only alphabetic
      .slice(0, 50); // Limit to top 50 keywords

    // Count frequency
    const wordFreq = {};
    keywords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Sort by frequency and get top keywords
    const sortedKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    return sortedKeywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
}

module.exports = { extractKeywordsFromResume };

