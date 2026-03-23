import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from '../models/Task.js';
import User from '../models/User.js';

import connectDatabase from '../config/db.js';

async function seedTasks() {
  try {
    // Connect to MongoDB using server config
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    // Clear existing tasks
    await Task.deleteMany({});
    console.log('🗑️  Cleared existing tasks');

    // Find users (assume at least admin and one user exist)
    const admin = await User.findOne({ role: 'admin' });
    const user = await User.findOne({ role: { $ne: 'admin' } });
    
    if (!admin) {
      console.error('❌ No admin user found. Create admin first: node src/seed/adminSeed.js');
      return;
    }
    if (!user) {
      console.warn('⚠️  No regular user found. Creating demo user tasks for admin only.');
    }

    const sampleTasks = [
      {
        title: 'Review Q3 candidate profiles',
        description: 'Go through 15 new applications for Senior Developer roles. Prioritize frontend skills.',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
        status: 'Pending',
        priority: 'HIGH',
        assignedTo: user?._id || admin._id,
        createdBy: admin._id,
      },
      {
        title: 'Update hiring workflow documentation',
        description: 'Document new task approval process with screenshots. Share with team.',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
        status: 'In Progress',
        priority: 'MEDIUM',
        assignedTo: user?._id || admin._id,
        createdBy: admin._id,
      },
      {
        title: 'Conduct React Developer interview',
        description: '30-min interview with Sajeena. Focus on hooks, performance, Tailwind.',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
        status: 'Pending Review',
        priority: 'HIGH',
        assignedTo: user?._id || admin._id,
        createdBy: admin._id,
        submission: {
          text: 'Uploaded React coding test and resume.',
          fileName: 'react-test.jsx',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      },
      {
        title: 'Approve team calendar integration',
        description: 'Review Google Calendar sync feature. Test scheduling conflicts.',
        deadline: null,
        status: 'Completed',
        priority: 'LOW',
        assignedTo: user?._id || admin._id,
        createdBy: admin._id,
        review: {
          decision: 'Approved',
          feedback: 'Great work! Ready for prod.',
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
      {
        title: 'Fix task submission upload bug',
        description: 'File uploads fail for >5MB. Add validation and progress bar.',
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        status: 'Rejected',
        priority: 'HIGH',
        assignedTo: admin._id,
        createdBy: admin._id,
        submission: {
          text: 'Added resize logic.',
          fileUrl: 'https://example.com/bugfix.zip',
          submittedAt: new Date(),
        },
        review: {
          decision: 'Rejected',
          feedback: 'Need chunked upload for large files.',
          reviewedAt: new Date(),
        },
      },
      {
        title: 'Onboard new team member',
        description: 'Setup accounts, assign first task, intro call.',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        priority: 'MEDIUM',
        assignedTo: admin._id,
        createdBy: admin._id,
      },
    ];

    // Insert tasks
    const createdTasks = await Task.insertMany(sampleTasks);
    console.log(`✅ Seeded ${createdTasks.length} tasks successfully!`);

    console.log('Sample tasks created. View at /tasks (admin) or user dashboard.');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedTasks();

