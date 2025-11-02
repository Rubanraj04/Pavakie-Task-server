const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Load environment variables
dotenv.config();

// Sample data - Note: Passwords should be changed after seeding for security
const users = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'candidate',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    experience: 3,
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'candidate',
    skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
    experience: 5,
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'candidate',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Docker'],
    experience: 2,
  },
  {
    name: 'Sarah Williams',
    email: 'sarah.williams@example.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'candidate',
    skills: ['React', 'TypeScript', 'Redux', 'Next.js'],
    experience: 4,
  },
  {
    name: 'Tech Corp HR',
    email: 'hr@techcorp.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'recruiter',
  },
  {
    name: 'Innovate Solutions',
    email: 'jobs@innovate.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'recruiter',
  },
  {
    name: 'Admin User',
    email: 'admin@jobportal.com',
    password: crypto.randomBytes(16).toString('hex'), // Random password - user should reset
    role: 'admin',
  },
];

const jobs = [
  {
    title: 'Senior Full Stack Developer',
    company: 'Tech Corp',
    description: `We are looking for an experienced Full Stack Developer to join our dynamic team. You will be responsible for developing and maintaining web applications using modern technologies.

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews
- Mentor junior developers`,
    requirements: [
      'Bachelor\'s degree in Computer Science or related field',
      '5+ years of experience in web development',
      'Strong problem-solving skills',
      'Excellent communication skills',
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
    experience: 5,
    location: 'San Francisco, CA',
    salary: {
      min: 120,
      max: 180,
      currency: 'USD',
    },
    status: 'active',
  },
  {
    title: 'Python Backend Developer',
    company: 'Innovate Solutions',
    description: `Join our backend team to build scalable APIs and microservices. You will work on high-traffic applications serving millions of users.

Responsibilities:
- Design and implement RESTful APIs
- Optimize database queries
- Ensure system reliability and performance
- Work with cloud infrastructure`,
    requirements: [
      '3+ years of Python development experience',
      'Experience with Django or Flask',
      'Knowledge of database design',
      'Understanding of cloud platforms (AWS/GCP)',
    ],
    skills: ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker'],
    experience: 3,
    location: 'Remote',
    salary: {
      min: 100,
      max: 150,
      currency: 'USD',
    },
    status: 'active',
  },
  {
    title: 'React Frontend Developer',
    company: 'Tech Corp',
    description: `We need a talented React developer to create amazing user experiences. You will work on our main product frontend using the latest React features.

Responsibilities:
- Build responsive and accessible UI components
- Implement state management with Redux
- Optimize application performance
- Write unit and integration tests`,
    requirements: [
      '3+ years of React experience',
      'Strong knowledge of JavaScript/TypeScript',
      'Experience with Redux or Context API',
      'Understanding of modern CSS',
    ],
    skills: ['React', 'TypeScript', 'Redux', 'Next.js', 'CSS'],
    experience: 3,
    location: 'New York, NY',
    salary: {
      min: 90,
      max: 140,
      currency: 'USD',
    },
    status: 'active',
  },
  {
    title: 'Java Software Engineer',
    company: 'Enterprise Systems',
    description: `We're looking for a Java developer to join our enterprise software team. Work on large-scale applications used by Fortune 500 companies.

Responsibilities:
- Develop enterprise-grade applications
- Design system architecture
- Ensure code quality and best practices
- Collaborate with DevOps team`,
    requirements: [
      'Bachelor\'s degree in Computer Science',
      '4+ years of Java development',
      'Experience with Spring Framework',
      'Knowledge of microservices architecture',
    ],
    skills: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'Kubernetes'],
    experience: 4,
    location: 'Austin, TX',
    salary: {
      min: 110,
      max: 160,
      currency: 'USD',
    },
    status: 'active',
  },
  {
    title: 'Node.js Backend Developer',
    company: 'StartupXYZ',
    description: `Join our fast-growing startup as a Node.js developer. Build scalable backend systems from scratch and have a huge impact on our product.

Responsibilities:
- Build RESTful APIs
- Design database schemas
- Implement authentication and authorization
- Write comprehensive tests`,
    requirements: [
      '2+ years of Node.js experience',
      'Strong knowledge of Express.js',
      'Experience with MongoDB or PostgreSQL',
      'Understanding of REST API design',
    ],
    skills: ['Node.js', 'Express', 'MongoDB', 'JWT', 'REST API'],
    experience: 2,
    location: 'Remote',
    salary: {
      min: 80,
      max: 120,
      currency: 'USD',
    },
    status: 'active',
  },
  {
    title: 'Full Stack Developer',
    company: 'Digital Agency Pro',
    description: `We need a full stack developer who can work on both frontend and backend. You'll work on diverse client projects using various technologies.

Responsibilities:
- Develop full-stack web applications
- Work directly with clients
- Participate in project planning
- Deploy applications to production`,
    requirements: [
      '3+ years of full-stack development',
      'Experience with React and Node.js',
      'Understanding of deployment processes',
      'Good client communication skills',
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
    experience: 3,
    location: 'Los Angeles, CA',
    salary: {
      min: 95,
      max: 145,
      currency: 'USD',
    },
    status: 'active',
  },
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobportal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Job.deleteMany({});
    await Application.deleteMany({});

    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✓ Created user: ${user.email} (${user.role})`);
    }

    // Get recruiter and candidate IDs
    const recruiters = createdUsers.filter(u => u.role === 'recruiter');
    const candidates = createdUsers.filter(u => u.role === 'candidate');

    // Create jobs
    console.log('\nCreating jobs...');
    const createdJobs = [];
    let recruiterIndex = 0;
    for (const jobData of jobs) {
      // Assign jobs to recruiters in rotation
      const postedBy = recruiters[recruiterIndex % recruiters.length];
      const job = new Job({
        ...jobData,
        postedBy: postedBy._id,
      });
      await job.save();
      createdJobs.push(job);
      console.log(`✓ Created job: ${job.title} at ${job.company}`);
      recruiterIndex++;
    }

    // Create applications
    console.log('\nCreating applications...');
    const applicationCount = Math.floor(Math.random() * 5) + 3; // 3-7 applications
    for (let i = 0; i < applicationCount; i++) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      const job = createdJobs[Math.floor(Math.random() * createdJobs.length)];
      
      // Check if application already exists
      const existingApp = await Application.findOne({
        job: job._id,
        candidate: candidate._id,
      });

      if (!existingApp) {
        const statuses = ['pending', 'reviewed', 'shortlisted'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const application = new Application({
          job: job._id,
          candidate: candidate._id,
          coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. With my background in ${candidate.skills.slice(0, 2).join(' and ')}, I believe I would be a great fit for your team.

I am excited about the opportunity to contribute to your organization and would welcome the chance to discuss my qualifications further.

Best regards,
${candidate.name}`,
          status: status,
        });

        await application.save();
        console.log(`✓ Created application: ${candidate.name} applied for ${job.title}`);
      }
    }

    // Create bookmarks
    console.log('\nCreating bookmarks...');
    for (let i = 0; i < 5; i++) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      const job = createdJobs[Math.floor(Math.random() * createdJobs.length)];
      
      if (!candidate.bookmarks.includes(job._id)) {
        candidate.bookmarks.push(job._id);
        await candidate.save();
        console.log(`✓ ${candidate.name} bookmarked ${job.title}`);
      }
    }

    console.log('\n✅ Seed data created successfully!');
    console.log(`\nSummary:`);
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Jobs: ${createdJobs.length}`);
    console.log(`- Applications: ${await Application.countDocuments()}`);
    
    console.log(`\n⚠️  Security Note: All users have been created with random passwords.`);
    console.log(`   Users should use the password reset feature to set their own passwords.`);
    console.log(`\n📧 Created User Accounts:`);
    console.log(`\nCandidates:`);
    candidates.forEach(u => console.log(`  ${u.email}`));
    console.log(`\nRecruiters:`);
    recruiters.forEach(u => console.log(`  ${u.email}`));
    console.log(`\nAdmin:`);
    const admin = createdUsers.find(u => u.role === 'admin');
    if (admin) console.log(`  ${admin.email}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run seed
const runSeed = async () => {
  await connectDB();
  await seedData();
};

runSeed();

