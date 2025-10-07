import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';

function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');

  const [employeeFile, setEmployeeFile] = useState(null);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dashboardDownloadUrl, setDashboardDownloadUrl] = useState('');

  const BACKEND_URL = 'http://127.0.0.1:5000';

  // Fetch employees function
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching employees from:', `${BACKEND_URL}/api/employees`);
      const response = await fetch(`${BACKEND_URL}/api/employees`, {
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Employees API Response:', data);
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      let errorMessage = 'Failed to fetch employees: ' + err.message;
      if (err.name === 'TimeoutError') {
        errorMessage = 'Request timed out while fetching employees.';
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to backend server. Please ensure it is running.';
      }
      setError(errorMessage);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch records function
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    setUploadMessage('');
    setDashboardDownloadUrl('');

    const trimmedEmployeeId = employeeId.trim();
    const trimmedFromDate = fromDate.trim();
    const trimmedToDate = toDate.trim();

    if (!trimmedEmployeeId && (!trimmedFromDate && !trimmedToDate)) {
      setError('Please select an employee or a date range to search.');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching records from:', `${BACKEND_URL}/api/search`);
      const params = new URLSearchParams();
      if (trimmedEmployeeId) params.append('employee_id', trimmedEmployeeId);
      if (trimmedFromDate) params.append('from_date', trimmedFromDate);
      if (trimmedToDate) params.append('to_date', trimmedToDate);
      
      const response = await fetch(`${BACKEND_URL}/api/search?${params}`, {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setRecords(data.records || []);
      if ((data.records || []).length === 0) {
        setError(data.message || 'No records found for the selected criteria.');
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      let errorMessage = 'Failed to fetch records: ' + err.message;
      if (err.name === 'TimeoutError') {
        errorMessage = 'Request to fetch records timed out.';
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to backend server.';
      }
      setError(errorMessage);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect for theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Refresh after successful upload
  useEffect(() => {
    if (uploadMessage && !uploadMessage.startsWith('Error') && !uploadMessage.includes('Failed')) {
      fetchEmployees();
    }
  }, [uploadMessage]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = () => {
    fetchRecords();
  };

  const handleEmployeeFileChange = (e) => {
    setEmployeeFile(e.target.files[0]);
    setUploadMessage('');
    setDashboardDownloadUrl('');
  };

  const handleAttendanceFileChange = (e) => {
    setAttendanceFile(e.target.files[0]);
    setUploadMessage('');
    setDashboardDownloadUrl('');
  };

  const handleUpload = async () => {
    if (!employeeFile || !attendanceFile) {
      setUploadMessage('Please select both Employee Data (binary) and Attendance Data (.dat/.txt) files.');
      return;
    }

    setUploadLoading(true);
    setUploadMessage('');
    setError(null);
    setDashboardDownloadUrl('');

    const formData = new FormData();
    formData.append('employeeFile', employeeFile);
    formData.append('attendanceFile', attendanceFile);

    try {
      console.log('Uploading files to:', `${BACKEND_URL}/api/upload`);
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upload API Response:', data);
      setUploadMessage(data.message || 'Files uploaded and processed successfully!');
      if (data.download_url) {
        setDashboardDownloadUrl(`${BACKEND_URL}${data.download_url}`);
      }
      fetchEmployees();
      if (employeeId || fromDate || toDate) {
        fetchRecords();
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      let errorMessage = 'Failed to upload and process files.';
      if (err.name === 'TimeoutError') {
        errorMessage = 'Upload request timed out. Backend processing is taking too long.';
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      setUploadMessage(errorMessage);
      setError(errorMessage);
    } finally {
      setUploadLoading(false);
      setEmployeeFile(null);
      setAttendanceFile(null);
    }
  };

  // Helper functions
  const timeToHours = (time) => {
    if (!time || time === 'N/A' || time === '') return 0;
    const parts = time.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours + minutes / 60 + seconds / 3600;
  };

  const isLate = (checkIn) => {
    if (!checkIn || checkIn === 'N/A' || checkIn === '') return false;
    const checkInTime = timeToHours(checkIn);
    return checkInTime > 9.5;
  };

  const getWorkingHours = (record, cap = true) => {
    const startTimeHours = 9.5;
    const endTimeHours = 17.0;
    const maxWorkHours = 7.5;

    const checkInHours = timeToHours(record.Check_In);
    const checkOutHours = timeToHours(record.Check_Out);

    if (!record.Check_In || record.Check_In === 'N/A' || record.Check_In === '') {
      if (record.Check_Out && record.Check_Out !== 'N/A' && record.Check_Out !== '') {
        const rawHours = checkOutHours - startTimeHours;
        return cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours;
      }
      return 0;
    }

    if (!record.Check_Out || record.Check_Out === 'N/A' || record.Check_Out === '') {
      const rawHours = endTimeHours - checkInHours;
      return cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours;
    }

    const rawHours = checkOutHours - checkInHours;
    const actualWorkingHours = parseFloat(record.Working_Hours);
    return !isNaN(actualWorkingHours) && record.Working_Hours !== 'N/A'
      ? (cap ? Math.min(actualWorkingHours, maxWorkHours) : actualWorkingHours)
      : (cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours);
  };

  const isPresent = r => (r.Status && r.Status.toLowerCase() === 'present');

  const getAbsentDates = () => {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const absentDates = [];
    const recordDates = new Set(records.map(r => r.Date));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
      const isAbsent = (!recordDates.has(dateStr) && !isWeekend) || (records.find(r => r.Date === dateStr && r.Status === 'ABSENT'));
      if (isAbsent) absentDates.push({ date: dateStr, day: dayOfWeek });
    }
    return absentDates;
  };

  const getExtraWorkingDates = () => records.filter(r => {
    const dayOfWeek = new Date(r.Date).toLocaleDateString('en-US', { weekday: 'long' });
    return r.Status === 'PRESENT' && (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday');
  }).map(r => ({ date: r.Date, day: new Date(r.Date).toLocaleDateString('en-US', { weekday: 'long' }) }));

  // Calculate statistics (in correct order)
  const totalAttendance = records.filter(r => r.Status === 'PRESENT').length;
  const totalDays = fromDate && toDate
    ? Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1
    : records.length;
  
  const absentDates = getAbsentDates();
  const extraWorkingDates = getExtraWorkingDates();
  const totalAbsent = absentDates.length;
  const totalExtraWorking = extraWorkingDates.length;
  
  const validRecords = records.filter(r => getWorkingHours(r) > 0);
  const avgWorkingHours = validRecords.length > 0 
    ? (validRecords.reduce((sum, r) => sum + getWorkingHours(r), 0) / validRecords.length).toFixed(2) 
    : '0.00';

  // Chart data
  // Show all dates in the selected range, even if no record exists or working hours are zero
  const getAllDatesInRange = () => {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const allDates = getAllDatesInRange();
  const recordMap = Object.fromEntries(records.map(r => [r.Date, r]));
  const workingHoursData = allDates.length > 0
    ? allDates.map(date => {
        const record = recordMap[date];
        const hours = record ? parseFloat(getWorkingHours(record, false).toFixed(2)) : 0;
        return hours > 0 ? { date, hours } : null;
      }).filter(Boolean)
    : records.map(record => {
        const hours = parseFloat(getWorkingHours(record, false).toFixed(2));
        return hours > 0 ? { date: record.Date, hours } : null;
      }).filter(Boolean);

  const validCheckInOutRecords = records.filter(record => {
    const checkIn = record.Check_In && record.Check_In !== 'N/A' ? timeToHours(record.Check_In) : null;
    const checkOut = record.Check_Out && record.Check_Out !== 'N/A' ? timeToHours(record.Check_Out) : null;
    if (checkIn === null || checkOut === null) return false;
    if (checkIn >= 12.5) return false;
    if (checkOut < 14) return false;
    if (checkIn >= checkOut) return false;
    return true;
  });

  // Show all dates in the selected range, even if no valid check-in/out record exists
  const checkInOutMap = Object.fromEntries(validCheckInOutRecords.map(r => [r.Date, r]));
  const checkInOutData = allDates.length > 0
    ? allDates.map(date => {
        const record = checkInOutMap[date];
        return {
          date,
          checkIn: record ? parseFloat(timeToHours(record.Check_In).toFixed(2)) : null,
          checkOut: record ? parseFloat(timeToHours(record.Check_Out).toFixed(2)) : null
        };
      })
    : validCheckInOutRecords.map(record => ({
        date: record.Date,
        checkIn: parseFloat(timeToHours(record.Check_In).toFixed(2)),
        checkOut: parseFloat(timeToHours(record.Check_Out).toFixed(2))
      }));

  const checkInDistributionData = () => {
    const timeBins = {
      'Before 8 AM': 0,
      '8:00 - 8:59 AM': 0,
      '9:00 - 9:29 AM': 0,
      '9:30 - 10:29 AM (Late)': 0,
      '10:30 - 11:29 AM (Late)': 0,
      '11:30 AM - 12:29 PM (Late)': 0,
      'Missed or Missing Check-In': 0,
    };
    records.forEach(record => {
      if (record.Check_In && record.Check_In !== 'N/A' && record.Check_In !== '') {
        const checkInHours = timeToHours(record.Check_In);
        if (checkInHours < 8) {
          timeBins['Before 8 AM']++;
        } else if (checkInHours >= 8 && checkInHours < 9) {
          timeBins['8:00 - 8:59 AM']++;
        } else if (checkInHours >= 9 && checkInHours < 9.5) {
          timeBins['9:00 - 9:29 AM']++;
        } else if (checkInHours >= 9.5 && checkInHours < 10.5) {
          timeBins['9:30 - 10:29 AM (Late)']++;
        } else if (checkInHours >= 10.5 && checkInHours < 11.5) {
          timeBins['10:30 - 11:29 AM (Late)']++;
        } else if (checkInHours >= 11.5 && checkInHours < 12.5) {
          timeBins['11:30 AM - 12:29 PM (Late)']++;
        } else {
          timeBins['Missed or Missing Check-In']++;
        }
      } else {
        timeBins['Missed or Missing Check-In']++;
      }
    });
    return Object.keys(timeBins).map(key => ({ name: key, value: timeBins[key] }));
  };

  const checkOutDistributionData = () => {
    const timeBins = {
      'Before 5:00 PM (Missed)': 0,
      '5:00 - 6:00 PM': 0,
      '6:00 - 7:00 PM (OT)': 0,
      '7:00 - 8:00 PM (OT)': 0,
      'After 8:00 PM (OT)': 0,
      'Missing Check-Out': 0,
    };
    records.forEach(record => {
      if (record.Check_Out && record.Check_Out !== 'N/A' && record.Check_Out !== '') {
        const checkOutHours = timeToHours(record.Check_Out);
        if (checkOutHours < 17) {
          timeBins['Before 5:00 PM (Missed)']++;
        } else if (checkOutHours >= 17 && checkOutHours < 18) {
          timeBins['5:00 - 6:00 PM']++;
        } else if (checkOutHours >= 18 && checkOutHours < 19) {
          timeBins['6:00 - 7:00 PM (OT)']++;
        } else if (checkOutHours >= 19 && checkOutHours < 20) {
          timeBins['7:00 - 8:00 PM (OT)']++;
        } else {
          timeBins['After 8:00 PM (OT)']++;
        }
      } else {
        timeBins['Missing Check-Out']++;
      }
    });
    return Object.keys(timeBins).map(key => ({ name: key, value: timeBins[key] }));
  };

  const attendancePieData = [
    { name: 'Present (On Time)', value: records.filter(r => isPresent(r) && !isLate(r.Check_In)).length, color: '#4CAF50' },
    { name: 'Present (Late)', value: records.filter(r => isPresent(r) && isLate(r.Check_In)).length, color: '#FFC107' },
    { name: 'Absent', value: totalAbsent, color: '#F44336' }
  ];

  const radarData = [
    {
      metric: 'Present',
      value: records.filter(r => isPresent(r)).length
    },
    {
      metric: 'Absent',
      value: totalAbsent
    },
    {
      metric: 'Late',
      value: records.filter(r => isPresent(r) && isLate(r.Check_In)).length
    },
    {
      metric: 'Extra',
      value: totalExtraWorking
    },
    {
      metric: 'Avg Hrs',
      value: parseFloat(avgWorkingHours)
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500' : 'bg-gradient-to-br from-gray-900 via-black to-gray-950'} flex items-center justify-center p-4 sm:p-6 lg:p-8`}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-7xl border border-gray-200 dark:border-gray-700">
        
        <div className="flex flex-col items-center mb-6">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-800 dark:text-yellow-400 text-center leading-tight">
            Employee Biometric Dashboard
          </h1>
        </div>

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white dark:from-gray-700 dark:to-gray-900 dark:text-gray-200 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg shadow-xl mb-8">
          <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-4">Upload Biometric Data Files</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee Data (Binary .dat):
              </label>
              <input
                type="file"
                onChange={handleEmployeeFileChange}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attendance Data (.dat/.txt):
              </label>
              <input
                type="file"
                accept=".dat,.txt"
                onChange={handleAttendanceFileChange}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!employeeFile || !attendanceFile || uploadLoading}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition duration-200"
          >
            {uploadLoading ? '⏳ Processing...' : '📤 Upload & Process'}
          </button>
        </div>

        {uploadMessage && (
          <div className={`p-4 rounded-lg shadow-md mb-8 ${uploadMessage.startsWith('Error') || uploadMessage.includes('Failed') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
            {uploadMessage}
            {dashboardDownloadUrl && (
              <a href={dashboardDownloadUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 dark:text-blue-300 underline">
                Download Dashboard
              </a>
            )}
          </div>
        )}

        {/* Search Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          >
            <option value="">Select Employee</option>
            {employees.map((employee) => (
              <option key={employee.Employee_ID} value={employee.Employee_ID}>
                {employee.Employee_Name} (ID: {employee.Employee_ID})
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 shadow-md transition duration-300"
          >
            {loading ? '🔄 Searching...' : '🔍 Search'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {records.length > 0 && !loading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              
              {/* Summary Card */}
              <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-blue-800 dark:text-yellow-300">📊 Summary</h2>
                <div className="space-y-2 text-gray-900 dark:text-gray-100">
                  <p><span className="font-semibold">Total Attendance:</span> {totalAttendance} days</p>
                  <p><span className="font-semibold">Total Days:</span> {totalDays} days</p>
                  <p><span className="font-semibold text-red-500">Total Absent:</span> {totalAbsent} days</p>
                  <p><span className="font-semibold text-green-600">Extra Working:</span> {totalExtraWorking} days</p>
                  <p><span className="font-semibold">Avg Working Hours:</span> {avgWorkingHours} hrs</p>
                </div>
                
                {absentDates.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📅 Absent Dates:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-900 dark:text-gray-100 max-h-24 overflow-y-auto">
                      {absentDates.slice(0, 5).map(({ date, day }, index) => (
                        <li key={index}>{date} ({day})</li>
                      ))}
                      {absentDates.length > 5 && <li>...and {absentDates.length - 5} more</li>}
                    </ul>
                  </div>
                )}

                {extraWorkingDates.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💼 Extra Working Dates:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-900 dark:text-gray-100 max-h-24 overflow-y-auto">
                      {extraWorkingDates.slice(0, 5).map(({ date, day }, index) => (
                        <li key={index}>{date} ({day})</li>
                      ))}
                      {extraWorkingDates.length > 5 && <li>...and {extraWorkingDates.length - 5} more</li>}
                    </ul>
                  </div>
                )}
              </div>

              {/* Working Hours Chart */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">⏰ Daily Working Hours</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={workingHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#ccc'} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <YAxis stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff', border: '1px solid #ccc' }} />
                    <Legend />
                    <Line type="monotone" dataKey="hours" stroke="#0055A4" strokeWidth={2} dot={{ r: 4 }} name="Hours" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Check In/Out Chart */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">🕐 Check-In & Check-Out</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={checkInOutData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#ccc'} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <YAxis stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff', border: '1px solid #ccc' }} />
                    <Legend />
                    <Line type="monotone" dataKey="checkIn" stroke="#36A2EB" strokeWidth={2} name="Check In" />
                    <Line type="monotone" dataKey="checkOut" stroke="#FF6384" strokeWidth={2} name="Check Out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Attendance Pie Chart */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">📈 Attendance Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={attendancePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Check-In Time Distribution */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">🕐 Check-In Time Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={checkInDistributionData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#ccc'} />
                    <XAxis type="number" stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <YAxis dataKey="name" type="category" stroke={theme === 'dark' ? '#aaa' : '#666'} width={150} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff', border: '1px solid #ccc' }} />
                    <Bar dataKey="value" fill="#36A2EB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Check-Out Time Distribution */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">🕑 Check-Out Time Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={checkOutDistributionData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#ccc'} />
                    <XAxis type="number" stroke={theme === 'dark' ? '#aaa' : '#666'} />
                    <YAxis dataKey="name" type="category" stroke={theme === 'dark' ? '#aaa' : '#666'} width={150} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff', border: '1px solid #ccc' }} />
                    <Bar dataKey="value" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg md:col-span-2 xl:col-span-3">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">🎯 Summary Insights</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={theme === 'dark' ? '#555' : '#ccc'} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: theme === 'dark' ? '#ddd' : '#333' }} />
                    <PolarRadiusAxis stroke={theme === 'dark' ? '#555' : '#ccc'} />
                    <Radar name="Summary" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto rounded-lg shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-600 dark:bg-blue-900 text-white">
                  <tr>
                    {['Employee ID', 'Name', 'Date', 'Check In', 'Check Out', 'Hours', 'Late Min', 'Status', 'Flag'].map((header) => (
                      <th key={header} className="py-3 px-4 text-sm font-semibold uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {records.map((record, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Employee_ID}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Employee_Name}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Date}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Check_In}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Check_Out}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Working_Hours}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Late_Minutes}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.Status === 'PRESENT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {record.Status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block w-4 h-4 rounded-full ${record.Late_Flag ? 'bg-red-500' : 'bg-gray-300'} border-2 ${record.Late_Flag ? 'border-red-700' : 'border-gray-400'}`}></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && records.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl text-gray-600 dark:text-gray-400">No records to display. Upload files or search to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
