console.log("Script loaded - attempting to run");
const BASE_URL = 'http://localhost:3000';

async function test() {
    console.log('--- STARTING API TESTS ---');

    // 1. Create Company
    const companyName = `TestCompany_${Date.now()}`;
    console.log(`\n1. Creating Company: ${companyName}`);
    const createCompanyRes = await fetch(`${BASE_URL}/company/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: companyName,
            email: `${companyName}@example.com`,
            googleId: `google_${Date.now()}`
        })
    });
    const companyData = await createCompanyRes.json();
    console.log('Create Company Status:', createCompanyRes.status);
    if (!companyData.success) {
        console.error('Failed to create company:', companyData);
        return;
    }
    const companyId = companyData.id;
    const companyCreds = companyData.credentials;
    console.log('Company ID:', companyId);
    console.log('Company Creds:', companyCreds);

    // 2. Login Company
    console.log('\n2. Logging in Company...');
    const loginCompRes = await fetch(`${BASE_URL}/auth/login/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyCreds)
    });
    const loginCompData = await loginCompRes.json();
    console.log('Login Status:', loginCompRes.status);
    if (!loginCompRes.ok) {
        console.error('Login Failed:', loginCompData);
        return;
    }
    const companyToken = loginCompData.token;
    console.log('Company Token obtained.');

    // 3. Get Company Dashboard (Protected)
    console.log('\n3. Fetching Company Dashboard...');
    const dashRes = await fetch(`${BASE_URL}/company/dashboard/${companyId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${companyToken}` }
    });
    const dashData = await dashRes.json();
    console.log('Dashboard Status:', dashRes.status);
    console.log('Dashboard Data Success:', dashData.success);

    // 4. Create Employee (Protected)
    console.log('\n4. Creating Employee...');
    const createEmpRes = await fetch(`${BASE_URL}/employee/create`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${companyToken}`
        },
        body: JSON.stringify([
            {
                name: "John Doe",
                company: companyId,
                homeLocation: { coordinates: [0, 0] }
            }
        ])
    });
    const currEmpResJson = await createEmpRes.json();
    console.log('Create Employee Status:', createEmpRes.status);
    
    if(!currEmpResJson.success) {
        console.error("Failed to create employee", currEmpResJson);
        return;
    }

    const employee = currEmpResJson.results[0];
    const empId = employee.id;
    const empCreds = employee.credentials;
    console.log('Employee ID:', empId);
    console.log('Employee Creds:', empCreds);

    // 5. Login Employee
    console.log('\n5. Logging in Employee...');
    const loginEmpRes = await fetch(`${BASE_URL}/auth/login/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empCreds)
    });
    const loginEmpData = await loginEmpRes.json();
    console.log('Login Status:', loginEmpRes.status);
    if (!loginEmpRes.ok) {
        console.error('Employee Login Failed:', loginEmpData);
        return;
    }
    const empToken = loginEmpData.token;
    console.log('Employee Token obtained.');

    // 6. Access Employee Profile (Protected)
    console.log(`\n6. Fetching Employee Profile (${empId})...`);
    const profileRes = await fetch(`${BASE_URL}/employee/profile/${empId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${empToken}` }
    });
    const profileData = await profileRes.json();
    console.log('Profile Status:', profileRes.status);
    console.log('Profile Data Success:', profileRes.success);

    // 7. Security Test: Employee accessing Company Dashboard (Should Fail)
    console.log('\n7. Security Test: Employee accessing Company Dashboard...');
    const secTestRes = await fetch(`${BASE_URL}/company/dashboard/${companyId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${empToken}` }
    });
    console.log('Security Test Status (Expected 403/401):', secTestRes.status);
    const secTestData = await secTestRes.json();
    console.log('Security Test Message:', secTestData.message);

    console.log('\n--- TESTS COMPLETED ---');
}

test().catch(console.error);
