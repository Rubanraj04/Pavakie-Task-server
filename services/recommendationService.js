const natural = require('natural');
const User = require('../models/User');
const Job = require('../models/Job');

// TF-IDF based recommendation (fallback when OpenAI is not available)
function calculateTFIDFScore(userSkills, userKeywords, jobDescription, jobSkills, jobRequirements) {
  // Combine all job text
  const jobText = [
    jobDescription || '',
    ...(jobSkills || []),
    ...(jobRequirements || []),
  ].join(' ').toLowerCase();

  // Combine user skills and keywords
  const userText = [
    ...(userSkills || []),
    ...(userKeywords || []),
  ].join(' ').toLowerCase();

  if (!jobText.trim() || !userText.trim()) {
    return 0;
  }

  // Tokenize
  const tokenizer = new natural.WordTokenizer();
  const userTokens = tokenizer.tokenize(userText);
  const jobTokens = tokenizer.tokenize(jobText);

  if (!userTokens || !jobTokens || userTokens.length === 0 || jobTokens.length === 0) {
    return 0;
  }

  // Create TF-IDF
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  tfidf.addDocument(jobTokens);

  let score = 0;
  const userSkillSet = new Set(userTokens);
  
  userSkillSet.forEach(skill => {
    const tfidfScore = tfidf.tfidf(skill, 0);
    if (tfidfScore > 0) {
      score += tfidfScore;
    }
  });

  return score;
}

// OpenAI-based recommendation (if API key is provided)
async function getOpenAIRecommendations(user, jobs) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const userProfile = {
      skills: user.skills || [],
      experience: user.experience || 0,
      resumeKeywords: user.resumeKeywords || [],
    };

    const jobsData = jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      requirements: job.requirements || [],
      skills: job.skills || [],
    }));

    const prompt = `You are a job recommendation system. Based on the following user profile and available jobs, rank the jobs from most relevant to least relevant.

User Profile:
- Skills: ${userProfile.skills.join(', ')}
- Experience: ${userProfile.experience} years
- Resume Keywords: ${userProfile.resumeKeywords.join(', ')}

Available Jobs:
${jobsData.map((job, idx) => `
Job ${idx + 1}:
- ID: ${job.id}
- Title: ${job.title}
- Description: ${job.description.substring(0, 200)}...
- Required Skills: ${job.skills.join(', ')}
- Requirements: ${job.requirements.join(', ')}
`).join('\n')}

Return a JSON array of job IDs ranked by relevance (most relevant first). Format: ["job_id_1", "job_id_2", ...]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that returns only valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content.trim();
    const rankedIds = JSON.parse(content);

    return rankedIds;
  } catch (error) {
    console.error('OpenAI recommendation error:', error);
    return null;
  }
}

// Main recommendation function
async function getRecommendations(userId, limit = 10) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get active jobs
    const jobs = await Job.find({ status: 'active' }).populate('postedBy', 'name email');

    if (jobs.length === 0) {
      return [];
    }

    // Try OpenAI first
    let rankedJobIds = await getOpenAIRecommendations(user, jobs);

    // Fallback to TF-IDF if OpenAI fails or is not available
    if (!rankedJobIds) {
      const scoredJobs = jobs.map(job => {
        const score = calculateTFIDFScore(
          user.skills,
          user.resumeKeywords,
          job.description,
          job.skills,
          job.requirements
        );
        return { job, score };
      });

      // Sort by score (descending)
      scoredJobs.sort((a, b) => b.score - a.score);
      rankedJobIds = scoredJobs.map(item => item.job._id.toString());
    }

    // Create a map for quick lookup
    const jobMap = new Map(jobs.map(job => [job._id.toString(), job]));

    // Return jobs in recommended order
    const recommendedJobs = rankedJobIds
      .map(id => jobMap.get(id))
      .filter(job => job !== undefined)
      .slice(0, limit);

    return recommendedJobs;
  } catch (error) {
    console.error('Recommendation error:', error);
    throw error;
  }
}

module.exports = { getRecommendations, calculateTFIDFScore };

