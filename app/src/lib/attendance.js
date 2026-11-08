export const ATTENDANCE_STATUSES=[['present','Present'],['half','Half day'],['absent','Absent'],['leave','Leave'],['off','Day off']];
export function cleanAttendance(input,today,actor,at){
 const date=String(input.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>today)throw new Error('Choose a valid attendance date up to today');
 if(!ATTENDANCE_STATUSES.some(([key])=>key===input.status))throw new Error('Choose an attendance status');
 const time=String(input.checkIn||'');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Choose a valid check-in time');
 if(time&&!['present','half'].includes(input.status))throw new Error('Check-in time is only for present or half-day attendance');
 return {date,status:input.status,checkIn:time,note:String(input.note||'').trim(),by:actor,at,source:'manual'};
}
export function attendanceForDay(row,day,seedDay){
 if(row.entries?.[day])return row.entries[day];
 const distance=Math.round((Date.parse(seedDay)-Date.parse(day))/86400000),index=(row.days?.length||0)-1-distance;
 return index>=0&&index<(row.days?.length||0)?{status:row.days[index],source:'sample'}:null;
}
