export const USER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#86efac" stroke="#111827" stroke-width="2.5"/><circle cx="16" cy="12" r="4.5" fill="none" stroke="#111827" stroke-width="2.5"/><path d="M9.5 23.5c0-2.5 3-4.5 6.5-4.5s6.5 2 6.5 4.5" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/></svg>`)}`;
export const BUILDING_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#e2e8f0" stroke="#111827" stroke-width="2.5"/><path d="M11 21.5V11c0-1 .8-1.5 1.5-1.5h7c.7 0 1.5.5 1.5 1.5v10.5M11 21.5h10M14.5 13h3M14.5 16h3M14.5 19h3" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`;
export const WAYPOINT_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fde047" stroke="#111827" stroke-width="2.5"/><circle cx="12" cy="12" r="3" fill="#111827"/></svg>`)}`;

export const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '16px' };

export const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] }, 
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

export const formatExcelTime = (excelTime) => {
  const numTime = Number(excelTime);
  if (isNaN(numTime) || (typeof excelTime === 'string' && excelTime.includes(':'))) {
    return excelTime || "--:--";
  }
  const totalMinutes = Math.round(numTime * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const calculateTimeLeft = (pickupTimeStr, targetDayValue) => {
  const now = new Date();
  const [hours, minutes] = pickupTimeStr.split(':').map(Number);
  let targetDate = new Date();
  targetDate.setHours(hours, minutes, 0, 0);
  let daysDiff = (targetDayValue - now.getDay() + 7) % 7;
  if (daysDiff === 0 && targetDate < now) daysDiff = 7;
  targetDate.setDate(now.getDate() + daysDiff);
  const diffMs = targetDate - now;

  if (diffMs > 86400000) {
    const days = Math.floor(diffMs / 86400000);
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  } else {
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diffMs / 1000 / 60) % 60);
    return `${h}h ${m}m`;
  }
};

export const getPinIcon = (type, googleMaps) => {
  if (!googleMaps) return null; 
  const isWaypoint = type === 'WAYPOINT';
  const size = isWaypoint ? 24 : 32;
  const center = size / 2;
  let url = WAYPOINT_SVG;
  if (type === 'USER') url = USER_SVG;
  if (type === 'BUILDING') url = BUILDING_SVG;

  return {
      url: url,
      scaledSize: new googleMaps.Size(size, size),
      anchor: new googleMaps.Point(center, center) 
  };
};

export const daysOfWeek = [
  { label: 'Mon', value: 1, key: 'Mon' }, { label: 'Tue', value: 2, key: 'Tue' },
  { label: 'Wed', value: 3, key: 'Wed' }, { label: 'Thu', value: 4, key: 'Thu' },
  { label: 'Fri', value: 5, key: 'Fri' }, { label: 'Sat', value: 6, key: 'Sat' },
  { label: 'Sun', value: 0, key: 'Sun' }
];