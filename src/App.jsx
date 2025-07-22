import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import * as THREE from 'three';
import VANTA from 'vanta/dist/vanta.dots.min';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, BarElement);

function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://biometrics-dashboard.onrender.com/';

  // Initialize VANTA effect only once on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        console.log('Fetching employees from:', `${BACKEND_URL}/api/employees`);
        const response = await axios.get(`${BACKEND_URL}/api/employees`, { timeout: 5000 });
        console.log('Employees API Response:', response.data);
        setEmployees(response.data.employees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setError('Failed to fetch employee list. Please ensure the backend server is running and accessible.');
      }
    };
    fetchEmployees();

    if (vantaRef.current && !vantaEffect.current) {
      vantaEffect.current = VANTA({
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0x00ff00,
        backgroundColor: theme === 'dark' ? 0x1a1a1a : 0x000000
      });
    }

    return () => {
      if (vantaEffect.current && typeof vantaEffect.current.destroy === 'function') {
        vantaEffect.current.destroy();
      }
      vantaEffect.current = null;
    };
  }, []); // Empty dependency array for mount only

  // Update VANTA background color on theme change
  useEffect(() => {
    if (vantaEffect.current) {
      vantaEffect.current.setOptions({
        backgroundColor: theme === 'dark' ? 0x1a1a1a : 0x000000
      });
    }
  }, [theme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === 'admin@artpark.com' && password === 'password123') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setRecords([]); // Clear records on logout
    setEmployeeId('');
    setFromDate('');
    setToDate('');
    setError(null);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    const trimmedEmployeeId = employeeId.trim();
    const trimmedFromDate = fromDate.trim();
    const trimmedToDate = toDate.trim();

    try {
      console.log('Fetching records from:', `${BACKEND_URL}/api/search`);
      const response = await axios.get(`${BACKEND_URL}/api/search`, {
        params: { employee_id: trimmedEmployeeId, from_date: trimmedFromDate, to_date: trimmedToDate },
        timeout: 5000
      });
      console.log('API Request URL:', `${BACKEND_URL}/api/search?employee_id=${trimmedEmployeeId}&from_date=${trimmedFromDate}&to_date=${trimmedToDate}`);
      console.log('API Response:', response.data);
      setRecords(response.data.records);
      if (response.data.records.length === 0) {
        setError(response.data.message || 'No records found for the selected criteria.');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      let errorMessage = 'Failed to fetch records: ' + error.message;
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to the backend server. Please ensure it is running and accessible.';
      } else if (error.response) {
        errorMessage = `Server responded with status ${error.response.status}: ${error.response.data.message || error.message}`;
      } else if (error.code === 'ERR_CORS') {
        errorMessage = 'CORS issue detected. Check your backend CORS configuration.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      setError(errorMessage);
      setRecords([]);
    }
    setLoading(false);
  };

  const timeToHours = (time) => {
    if (!time || time === 'N/A' || time === '') return 0;
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours + minutes / 60 + (seconds || 0) / 3600;
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
        console.log(`Raw hours (N/A to ${record.Check_Out}): ${rawHours}`);
        return cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours;
      }
      return 0;
    }

    if (!record.Check_Out || record.Check_Out === 'N/A' || record.Check_Out === '') {
      const rawHours = endTimeHours - checkInHours;
      console.log(`Raw hours (${record.Check_In} to N/A): ${rawHours}`);
      return cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours;
    }

    const rawHours = checkOutHours - checkInHours;
    console.log(`Raw hours (${record.Check_In} to ${record.Check_Out}): ${rawHours}`);
    const actualWorkingHours = parseFloat(record.Working_Hours);
    return !isNaN(actualWorkingHours) && record.Working_Hours !== 'N/A' 
      ? (cap ? Math.min(actualWorkingHours, maxWorkHours) : actualWorkingHours)
      : (cap ? Math.max(0, Math.min(rawHours, maxWorkHours)) : rawHours);
  };

  const totalAttendance = records.filter(r => r.Status === 'PRESENT').length;
  const totalDays = fromDate && toDate 
    ? Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1 
    : records.length;
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
  const absentDates = getAbsentDates();
  const extraWorkingDates = getExtraWorkingDates();
  const totalAbsent = absentDates.length;
  const totalExtraWorking = extraWorkingDates.length;
  const avgWorkingHours = records.length > 0 ? (records.reduce((sum, r) => sum + getWorkingHours(r), 0) / records.length).toFixed(2) : 0;

  const workingHoursChartData = {
    labels: records.map(record => record.Date),
    datasets: [{
      label: 'Working Hours',
      data: records.map(record => getWorkingHours(record, false)),
      borderColor: '#0055A4',
      backgroundColor: 'rgba(0, 85, 164, 0.2)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#0055A4',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#0055A4',
    }]
  };

  const checkInOutChartData = {
    labels: records.map(record => record.Date),
    datasets: [{
      label: 'Check In Time',
      data: records.map(record => record.Check_In && record.Check_In !== 'N/A' ? timeToHours(record.Check_In) : 0),
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      fill: false,
      tension: 0.4,
      pointBackgroundColor: '#36A2EB',
      pointBorderColor: '#fff',
      pointRadius: records.map(record => record.Check_In && record.Check_In !== 'N/A' ? 5 : 0),
      pointHoverRadius: 7,
    }, {
      label: 'Check Out Time',
      data: records.map(record => record.Check_Out && record.Check_Out !== 'N/A' ? timeToHours(record.Check_Out) : 24),
      borderColor: '#FF6384',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      fill: false,
      tension: 0.4,
      pointBackgroundColor: '#FF6384',
      pointBorderColor: '#fff',
      pointRadius: records.map(record => record.Check_Out && record.Check_Out !== 'N/A' ? 5 : 0),
      pointHoverRadius: 7,
    }]
  };

  const attendanceChartData = {
    labels: ['Present (On Time)', 'Present (Late)', 'Absent'],
    datasets: [{
      label: 'Attendance Distribution',
      data: [
        records.filter(r => r.Status === 'PRESENT' && !isLate(r.Check_In)).length,
        records.filter(r => r.Status === 'PRESENT' && isLate(r.Check_In)).length,
        totalAbsent
      ],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      borderColor: theme === 'dark' ? '#333' : '#fff',
      borderWidth: 2
    }]
  };

  const dailyLateArrivalsData = () => {
    const lateCounts = {};
    records.forEach(record => {
      if (isLate(record.Check_In)) {
        lateCounts[record.Date] = (lateCounts[record.Date] || 0) + 1;
      }
    });
    const dates = Object.keys(lateCounts).sort();
    const data = dates.map(date => lateCounts[date]);
    return {
      labels: dates,
      datasets: [{
        label: 'Number of Late Arrivals',
        data: data,
        backgroundColor: '#FF9800',
        borderColor: '#E65100',
        borderWidth: 1,
        hoverBackgroundColor: '#FFB74D',
        hoverBorderColor: '#FB8C00',
      }]
    };
  };

  const checkInDistributionData = () => {
    const timeBins = {
      'Before 8 AM': 0,
      '8:00 - 8:59 AM': 0,
      '9:00 - 9:29 AM': 0,
      '9:30 - 10:29 AM (Late)': 0,
      '10:30 - 11:29 AM (Late)': 0,
      '11:30 AM - 12:29 PM (Late)': 0,
      'After 12:30 PM (Late)': 0,
      'N/A': 0,
    };
    records.forEach(record => {
      if (record.Check_In && record.Check_In !== 'N/A' && record.Check_In !== '') {
        const checkInHours = timeToHours(record.Check_In);
        if (checkInHours < 8) timeBins['Before 8 AM']++;
        else if (checkInHours >= 8 && checkInHours < 9) timeBins['8:00 - 8:59 AM']++;
        else if (checkInHours >= 9 && checkInHours < 9.5) timeBins['9:00 - 9:29 AM']++;
        else if (checkInHours >= 9.5 && checkInHours < 10.5) timeBins['9:30 - 10:29 AM (Late)']++;
        else if (checkInHours >= 10.5 && checkInHours < 11.5) timeBins['10:30 - 11:29 AM (Late)']++;
        else if (checkInHours >= 11.5 && checkInHours < 12.5) timeBins['11:30 AM - 12:29 PM (Late)']++;
        else timeBins['After 12:30 PM (Late)']++;
      } else {
        timeBins['N/A'] += (!record.Check_In || record.Check_In === 'N/A') || (!record.Check_Out || record.Check_Out === 'N/A') ? 1 : 0;
      }
    });
    return {
      labels: Object.keys(timeBins),
      datasets: [{
        label: 'Number of Check-Ins',
        data: Object.values(timeBins),
        backgroundColor: ['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#9E9E9E'],
        borderColor: theme === 'dark' ? '#333' : '#fff',
        borderWidth: 1,
      }]
    };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-100'} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-inter ${theme === 'light' ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500' : 'bg-gradient-to-br from-gray-900 via-black to-gray-950'} flex items-center justify-center p-4 sm:p-6 lg:p-8`}>
      <div ref={vantaRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-7xl border border-gray-200 dark:border-gray-700 relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <img src="logo.png" className="h-18 sm:h-26 mb-6" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-800 dark:text-yellow-400 text-center leading-tight">
            Employee Biometric <span className="block sm:inline">Dashboard</span>
          </h1>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="mb-6 mx-auto block px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white dark:from-gray-700 dark:to-gray-900 dark:text-gray-200 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex items-center gap-2"
        >
          {theme === 'light' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              Switch to Dark Mode
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.45 4.75a.75.75 0 001.06-1.06l-2-2a.75.75 0 00-1.06 1.06l2 2zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zm-4-4.45a.75.75 0 00-1.06-1.06l-2 2a.75.75 0 001.06 1.06l2-2zM4.25 10a.75.75 0 000-1.5H3a.75.75 0 000 1.5h1.25zm12.5 0a.75.75 0 000-1.5h-1.25a.75.75 0 000 1.5h1.25zM15.75 5.75a.75.75 0 00-1.06-1.06l-2 2a.75.75 0 001.06 1.06l2-2zM4.25 4.25a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06-1.06l-2-2z" clipRule="evenodd" />
              </svg>
              Switch to Light Mode
            </>
          )}
        </motion.button>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-all duration-300 ease-in-out flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Logout
          </motion.button>
        
  

        <div className="flex flex-col md:flex-row gap-4 mb-8 items-stretch">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <motion.select
              whileFocus={{ scale: 1.02 }}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 shadow-sm flex-1 min-w-[150px]"
            >
              <option value="">Select Employee</option>
              {employees.map((employee) => (
                <option key={employee.Employee_ID} value={employee.Employee_ID}>
                  {employee.Employee_Name} (ID: {employee.Employee_ID})
                </option>
              ))}
            </motion.select>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 shadow-sm flex-1 min-w-[150px]"
            />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 shadow-sm flex-1 min-w-[150px]"
            />
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearch}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 ease-in-out shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Search
                </>
              )}
            </motion.button>
          </div>
        </div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center h-24 text-blue-600 dark:text-blue-300 text-lg font-medium"
          >
            <svg className="animate-spin h-8 w-8 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Fetching data...
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6 text-center"
            role="alert"
          >
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </motion.div>
        )}

        {records.length > 0 && !loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8"
          >
            <motion.div
              variants={itemVariants}
              className="bg-blue-50 dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-blue-200 dark:border-gray-600"
            >
              <h2 className="text-2xl font-bold mb-4 text-blue-800 dark:text-yellow-300">Summary</h2>
              <p className="text-gray-900 dark:text-gray-900 text-lg mb-2">Total Attendance: <span className="font-semibold">{totalAttendance} days</span></p>
              <p className="text-gray-900 dark:text-gray-900 text-lg mb-2">Total Days: <span className="font-semibold">{totalDays} days</span></p>
              <p className="text-gray-900 dark:text-gray-900 text-lg mb-2">Total Absent: <span className="font-semibold text-red-500">{totalAbsent} days</span></p>
              <p className="text-gray-900 dark:text-gray-900 text-lg mb-2">Total Extra Working: <span className="font-semibold text-green-600">{totalExtraWorking} days</span></p>
              <p className="text-gray-900 dark:text-gray-900 text-lg mb-2">Avg Working Hours: <span className="font-semibold">{avgWorkingHours} hrs</span></p>
              {absentDates.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-900 dark:text-gray-900 font-semibold text-md mb-2">Absent Dates:</p>
                  <ul className="list-disc pl-5 text-gray-900 dark:text-gray-900 max-h-24 overflow-y-auto custom-scrollbar">
                    {absentDates.map(({ date, day }, index) => (
                      <li key={index}>{date} (<span className="font-medium">{day}</span>)</li>
                    ))}
                  </ul>
                </div>
              )}
              {extraWorkingDates.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-md mb-2">Extra Working Dates:</p>
                  <ul className="list-disc pl-5 text-gray-900 dark:text-gray-900 max-h-24 overflow-y-auto custom-scrollbar">
                    {extraWorkingDates.map(({ date, day }, index) => (
                      <li key={index}>{date} (<span className="font-medium">{day}</span>)</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 h-96 flex items-center justify-center"
            >
              <Line
                data={workingHoursChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Daily Working Hours', font: { size: 20, weight: 'bold' }, color: theme === 'dark' ? '#E2E8F0' : '#1A202C' },
                    tooltip: { mode: 'index', intersect: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Hours', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568' },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                      title: { display: true, text: 'Date', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568' },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    }
                  }
                }}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 h-96 flex items-center justify-center"
            >
              <Line
                data={checkInOutChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Daily Check-In & Check-Out', font: { size: 20, weight: 'bold' }, color: theme === 'dark' ? '#E2E8F0' : '#1A202C' },
                    tooltip: { mode: 'index', intersect: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      title: { display: true, text: 'Time (HH:MM)', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: {
                        callback: function(value) {
                          const hours = Math.floor(value);
                          const minutes = Math.round((value - hours) * 60);
                          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        },
                        color: theme === 'dark' ? '#CBD5E0' : '#4A5568'
                      },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                      title: { display: true, text: 'Date', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568' },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    }
                  }
                }}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 h-96 flex items-center justify-center"
            >
              <Pie
                data={attendanceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Attendance Distribution', font: { size: 20, weight: 'bold' }, color: theme === 'dark' ? '#E2E8F0' : '#1A202C' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          let label = context.label || '';
                          if (label) label += ': ';
                          if (context.parsed !== null) label += context.parsed + ' days';
                          return label;
                        }
                      }
                    }
                  }
                }}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 h-96 flex items-center justify-center"
            >
              <Bar
                data={dailyLateArrivalsData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Late Arrivals Trend', font: { size: 20, weight: 'bold' }, color: theme === 'dark' ? '#E2E8F0' : '#1A202C' },
                    tooltip: { mode: 'index', intersect: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Number of Late Arrivals', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568', stepSize: 1 },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                      title: { display: true, text: 'Date', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568' },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    }
                  }
                }}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 h-96 flex items-center justify-center"
            >
              <Bar
                data={checkInDistributionData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Check-In Time Distribution', font: { size: 20, weight: 'bold' }, color: theme === 'dark' ? '#E2E8F0' : '#1A202C' },
                    tooltip: { mode: 'index', intersect: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Number of Check-Ins', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568', stepSize: 1 },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                      title: { display: true, text: 'Time Interval', color: theme === 'dark' ? '#A0AEC0' : '#4A5568' },
                      ticks: { color: theme === 'dark' ? '#CBD5E0' : '#4A5568', autoSkip: false, maxRotation: 45, minRotation: 45 },
                      grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                    }
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
        {records.length > 0 && !loading && (
          <div className="text-center text-lg font-semibold text-gray-1000 dark:text-gray-100 mb-6">
            <motion.table
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="w-full text-left table-auto"
            >
              <thead className="bg-blue-600 dark:bg-blue-900 text-white sticky top-0 shadow-md">
                <tr>
                  {['Employee ID', 'Name', 'Date', 'Check In', 'Check Out', 'Hours', 'Late Minutes', 'Status', 'Late Flag', 'Computed Is Late'].map((header) => (
                    <th key={header} className="py-3 px-4 text-sm font-semibold uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <motion.tr
                    key={record.Date + record.Employee_ID + index}
                    variants={itemVariants}
                    className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 ease-in-out"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Employee_ID}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Employee_Name}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Date}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Check_In}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Check_Out}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Working_Hours}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Late_Minutes}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Status}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{record.Late_Flag ? 'Yes' : 'No'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm">{isLate(record.Check_In) ? 'Yes' : 'No'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;
