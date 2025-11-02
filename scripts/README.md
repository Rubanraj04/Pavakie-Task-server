# Database Seeding Scripts

## Seed Mock Data

To populate your database with sample data (users, jobs, applications):

```bash
npm run seed
```

This will:
- Create 7 users (4 candidates, 2 recruiters, 1 admin)
- Create 6 job postings
- Create 3-7 random applications
- Create 5 random bookmarks

### User Accounts Created

⚠️ **Security Note:** All users are created with randomly generated passwords. Users must use the password reset feature to access their accounts.

**Candidates:**
- john.doe@example.com
- jane.smith@example.com
- mike.johnson@example.com
- sarah.williams@example.com

**Recruiters:**
- hr@techcorp.com
- jobs@innovate.com

**Admin:**
- admin@jobportal.com

### What Gets Created

- **Users**: Mix of candidates, recruiters, and one admin
- **Jobs**: 6 different job postings with various skills and requirements
- **Applications**: Random applications from candidates to jobs
- **Bookmarks**: Candidates have bookmarked some jobs

### Warning

⚠️ **This script will delete all existing data** in your database before seeding new data. Only run this in development!

### Customization

Edit `server/scripts/seed.js` to:
- Add more users
- Add more jobs
- Modify job details
- Change application statuses
- Add more bookmarks

