import react from 'react';
const EmployeeLanding = ({user}) => {
  return (
    <div>
        <h1>Welcome, {user.name} (Employee)</h1>
        <p>See and monitor your daily routes, assigned vehicles and time here.</p>
    </div>
    )
}
export default EmployeeLanding;