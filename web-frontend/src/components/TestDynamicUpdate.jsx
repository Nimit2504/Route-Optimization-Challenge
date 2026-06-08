import React, { useState } from 'react';
import api from '../utils/api';

const TestDynamicUpdate = () => {
    const [companyId, setCompanyId] = useState('');
    const [fleetId, setFleetId] = useState('');
    const [changes, setChanges] = useState('{\n  "schedule_changes": [],\n  "new_employees": []\n}');
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            let parsedChanges;
            try {
                parsedChanges = JSON.parse(changes);
            } catch (err) {
                setError("Invalid JSON format for 'changes'");
                setLoading(false);
                return;
            }

            const payload = {
                companyId,
                fleetId,
                changes: parsedChanges
            };

            const res = await api.post('/dynamic/', payload);

            setResponse(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Test Endpoint: POST /dynamic/</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Company ID:</label>
                    <input 
                        type="text" 
                        value={companyId} 
                        onChange={(e) => setCompanyId(e.target.value)} 
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="Enter Company ID"
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Fleet ID:</label>
                    <input 
                        type="text" 
                        value={fleetId} 
                        onChange={(e) => setFleetId(e.target.value)} 
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="Enter Fleet ID"
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Changes (JSON):</label>
                    <textarea 
                        value={changes} 
                        onChange={(e) => setChanges(e.target.value)} 
                        style={{ width: '100%', height: '200px', padding: '8px', fontFamily: 'monospace' }}
                        placeholder='{"key": "value"}'
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    {loading ? 'Sending...' : 'Send Request'}
                </button>
            </form>

            {error && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
                    <h3>Error:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
                </div>
            )}

            {response && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px' }}>
                    <h3>Response:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(response, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default TestDynamicUpdate;
