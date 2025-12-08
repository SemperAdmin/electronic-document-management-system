import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjcbsaxdkggloyzjbbln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY2JzYXhka2dnbG95empiYmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTg4NzgsImV4cCI6MjA3OTc5NDg3OH0.aUwxlvNCbNHFvM4Qv8eO1Xz0nMaFO4Dl0QX12fO4V5Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testHQMC() {
  try {
    console.log('Testing HQMC functionality...');
    
    // Check existing sections
    const { data: sections, error: sectionsError } = await supabase
      .from('hqmc_sections')
      .select('*');
    
    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      return;
    }
    
    console.log('Existing sections:', sections);
    
    // If no sections exist, create the three main sections
    if (!sections || sections.length === 0) {
      console.log('Creating initial HQMC sections...');
      
      const sectionsToCreate = [
        {
          name: 'Manpower & Reserve Affairs (MM)',
          type: 'MM',
          config: { 
            description: 'Handles personnel management, manpower planning, and reserve affairs',
            primaryColor: '#dc2626',
            icon: 'Users'
          }
        },
        {
          name: 'Plans, Policies & Operations (MP)',
          type: 'MP',
          config: { 
            description: 'Handles strategic planning, policy development, and operational coordination',
            primaryColor: '#2563eb',
            icon: 'FileText'
          }
        },
        {
          name: 'Facilities & Services (FM)',
          type: 'FM',
          config: { 
            description: 'Handles facility management, logistics, and support services',
            primaryColor: '#ca8a04',
            icon: 'Clock'
          }
        }
      ];
      
      for (const section of sectionsToCreate) {
        const { data, error } = await supabase
          .from('hqmc_sections')
          .insert([section])
          .select();
        
        if (error) {
          console.error(`Error creating ${section.type} section:`, error);
        } else {
          console.log(`Created ${section.type} section:`, data);
        }
      }
    }
    
    // Check requests
    const { data: requests, error: requestsError } = await supabase
      .from('section_requests')
      .select('*');
    
    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
    } else {
      console.log('Existing requests:', requests);
    }
    
    // Check members
    const { data: members, error: membersError } = await supabase
      .from('section_members')
      .select('*');
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
    } else {
      console.log('Existing members:', members);
    }
    
    console.log('HQMC test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testHQMC();