const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lwhsiieupsqypswrusmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHNpaWV1cHNxeXBzd3J1c21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzk0NTksImV4cCI6MjA4NzYxNTQ1OX0.wj93qGU1uFDMSuzTKrNOmd8FTkaLlOBlWqhayalnkRA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing Supabase connection...");
    const email = `testuser_${Date.now()}@gmail.com`;
    const password = "password123";

    console.log(`Signing up ${email}...`);
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email, password
    });

    if (signupError) {
        console.error("Signup failed:", signupError.message);
        return;
    }
    console.log("Signup success!");

    console.log("Logging in...");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email, password
    });

    if (loginError) {
        console.error("Login failed:", loginError.message);
        return;
    }
    console.log("Login success! User ID:", loginData.user.id);

    console.log("Inserting task...");
    const { data: insertData, error: insertError } = await supabase.from('tasks').insert([{
        title: "Test Task",
        priority: "alta",
        description: "Test description",
        status: "in-progress",
        user_id: loginData.user.id
    }]).select().single();

    if (insertError) {
        console.error("Insert failed:", insertError);
        return;
    }
    console.log("Insert success!", insertData);

    console.log("Fetching tasks...");
    const { data: fetchTasks, error: fetchError } = await supabase.from('tasks').select('*');
    if (fetchError) {
        console.error("Fetch failed:", fetchError);
        return;
    }
    console.log(`Fetched ${fetchTasks.length} tasks!`);
}

test();
