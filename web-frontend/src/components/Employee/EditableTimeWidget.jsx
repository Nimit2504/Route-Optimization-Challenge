import React, { useState, useEffect, useRef } from 'react';
import { Clock, Edit2 } from 'lucide-react';
import { formatExcelTime } from './DashboardUtils';

// 1. Accept onTimeUpdate and isUpdating from Dashboard.js props
const EditableTimeWidget = ({ activeFleet, employeeId, onTimeUpdate, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  // Removed local isUpdating state since Dashboard handles the loading state now
  const widgetRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isEditing && widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  const handleSave = () => {
    console.log("1. Widget OK clicked! editValue is:", editValue);
    
    if (!editValue) {
      console.error("1a. Stopped: editValue is empty!");
      return;
    }
    
    console.log("2. Sending time to Dashboard:", editValue);
    onTimeUpdate(editValue); 
    
    setIsEditing(false);
  };

  const formattedTime = formatExcelTime(activeFleet?.preferences?.timeWindow?.startTime);

  return (
    <div className="cc-widget" style={{ minWidth: '160px' }} ref={widgetRef}>
      <div className="cc-widget-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} className="text-green" />
          <span>Pickup Time</span>
        </div>
        {!isEditing && activeFleet && (
          <button 
            onClick={() => { setEditValue(formattedTime !== "--:--" ? formattedTime : ""); setIsEditing(true); }} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
            disabled={isUpdating} // Prevent clicking if already updating
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      
      <div className="cc-widget-content" style={{ marginTop: '8px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <Clock size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
              <input 
                type="time" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)}
                disabled={isUpdating} // Lock input during API call
                style={{ padding: '8px 10px 8px 36px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: 'white', width: '100%', outline: 'none' }}
              />
            </div>
            <button 
              onClick={handleSave} 
              disabled={isUpdating} // Lock button during API call
              style={{ background: '#10b981', color: '#000', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isUpdating ? '...' : 'OK'}
            </button>
          </div>
        ) : (
          <span className="cc-value-large">{isUpdating ? "Updating..." : formattedTime}</span>
        )}
      </div>
    </div>
  );
};

export default EditableTimeWidget;