import React from 'react'

const CompanyLanding = ({user}) => {
  return (
    <div>
        <h1>Welcome, {user.name} (Company)</h1>
        <p>Manage your company's fleet and logistics here.</p>
    </div>
  )
}

export default CompanyLanding