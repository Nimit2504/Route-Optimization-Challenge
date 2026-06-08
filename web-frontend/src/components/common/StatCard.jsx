import React from 'react';

const StatCard = ({ icon: Icon, label, value, type = 'default' }) => (
    <div className={`stat-card type-${type}`}>
        <div className="stat-icon">
            <Icon />
        </div>
        <div className="stat-info">
            <div className="label">{label}</div>
            <div className="value">{value}</div>
        </div>
    </div>
);

export default StatCard;
