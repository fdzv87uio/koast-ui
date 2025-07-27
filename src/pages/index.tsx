/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import io from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { CircularProgress } from '@mui/material';
import CustomModal from '@/components/CustomModal';
import toast from 'react-hot-toast';


// Lazy load the TableRow component
const LazyTableRow = lazy(() => import('../components/TableRow'));

// Define the CampaignData interface
interface CampaignData {
  _id: string; // MongoDB ID
  id: string; // Facebook Ad Campaign ID
  name: string;
  objective: string;
  status: string;
  effective_status: string;
  start_time: string;
  created_time: string;
  updated_time: string;
  buying_type: string;
  configured_status: string;
  source_campaign_id: string;
  account_id: string;
  spend: number;
  ROAS: number;
  CTR: number;
  timestamp: string; // ISO string
  createdAt: string;
  updatedAt: string;
  __v: number;
}


// Helper to evaluate a single comparison (e.g., "Spend > $500", "CampaignID == "XYZ"")
const evaluateSingleCondition = (condition: string, metrics: CampaignData): boolean => {
  const cleanedCondition = condition.trim();

  // Regex to match conditions like "Prop Operator Value"
  // It captures the property name, operator, and the value string (which might include $, %, or be a string literal)
  const match = cleanedCondition.match(/(\w+)\s*([<|>|=]{1,2})\s*([$"]?[\w\d.\s-]+%?"?)/i);

  if (!match) {
    console.warn(`Could not parse single condition: "${condition}"`);
    return false;
  }

  const [, propName, operator, valueStrRaw] = match;
  let metricValue: number | string | undefined;

  // Map propName to actual metric key and get its value from currentObject
  switch (propName.toLowerCase()) {
    case 'spend':
      metricValue = metrics.spend;
      break;
    case 'roas':
      metricValue = metrics.ROAS;
      break;
    case 'ctr':
      metricValue = metrics.CTR;
      break;
    case 'campaignid':
      metricValue = metrics.id;
      break;
    default:
      console.warn(`Unknown property in condition: "${propName}"`);
      return false;
  }

  // Parse the value string
  let targetValue: number | string;
  const valueStr = valueStrRaw.replace(/"/g, '').trim(); // Remove quotes for string literals and trim whitespace

  if (valueStr.includes('$')) {
    targetValue = parseFloat(valueStr.replace('$', ''));
  } else if (valueStr.includes('%')) {
    targetValue = parseFloat(valueStr.replace('%', '')) / 100;
  } else if (!isNaN(parseFloat(valueStr)) && !isNaN(Number(valueStr))) { // Check if it's a number (and not just an empty string becoming 0)
    targetValue = parseFloat(valueStr);
  } else { // Treat as string for Campaign ID comparison or other string values
    targetValue = valueStr;
  }

  // Perform comparison
  if (typeof metricValue === 'number' && typeof targetValue === 'number') {
    switch (operator) {
      case '>': return metricValue > targetValue;
      case '<': return metricValue < targetValue;
      case '>=': return metricValue >= targetValue;
      case '<=': return metricValue <= targetValue;
      case '==': return metricValue === targetValue;
      default: return false;
    }
  } else if (typeof metricValue === 'string' && typeof targetValue === 'string') {
     switch (operator) {
      case '==': return metricValue === targetValue;
      default: return false;
    }
  }

  console.warn(`Type mismatch or unsupported comparison for condition: "${condition}"`);
  return false;
};

// Function to evaluate the full rule string recursively
const evaluateRule = (ruleString: string, metrics: CampaignData): boolean => {
  let expression = ruleString.trim();

  // Remove "IF " prefix if present
  if (expression.toUpperCase().startsWith('IF ')) {
    expression = expression.substring(3).trim();
  }

  // Remove outermost parentheses if they enclose the entire expression
  if (expression.startsWith('(') && expression.endsWith(')')) {
    let openCount = 0;
    let isOuterParentheses = true;
    // Check if the parentheses truly enclose the entire expression
    for (let i = 1; i < expression.length - 1; i++) {
      if (expression[i] === '(') openCount++;
      else if (expression[i] === ')') openCount--;
      if (openCount < 0) { // Mismatched or not fully enclosing
        isOuterParentheses = false;
        break;
      }
    }
    if (isOuterParentheses && openCount === 0) {
      expression = expression.substring(1, expression.length - 1).trim();
    }
  }

  // Evaluate OR conditions (lowest precedence)
  let openParenthesesCount = 0;
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '(') {
      openParenthesesCount++;
    } else if (expression[i] === ')') {
      openParenthesesCount--;
    } else if (openParenthesesCount === 0 && expression.substring(i, i + 2).toUpperCase() === 'OR') {
      // Ensure 'OR' is a standalone word, not part of another word
      if ((i === 0 || /\s/.test(expression[i - 1])) && (i + 2 === expression.length || /\s/.test(expression[i + 2]))) {
        const leftPart = expression.substring(0, i).trim();
        const rightPart = expression.substring(i + 2).trim(); // +2 for "OR"
        return evaluateRule(leftPart, metrics) || evaluateRule(rightPart, metrics);
      }
    }
  }

  // If no top-level OR, evaluate AND conditions
  openParenthesesCount = 0;
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '(') {
      openParenthesesCount++;
    } else if (expression[i] === ')') {
      openParenthesesCount--;
    } else if (openParenthesesCount === 0 && expression.substring(i, i + 3).toUpperCase() === 'AND') {
      // Ensure 'AND' is a standalone word
      if ((i === 0 || /\s/.test(expression[i - 1])) && (i + 3 === expression.length || /\s/.test(expression[i + 3]))) {
        const leftPart = expression.substring(0, i).trim();
        const rightPart = expression.substring(i + 3).trim(); // +3 for "AND"
        return evaluateRule(leftPart, metrics) && evaluateRule(rightPart, metrics);
      }
    }
  }

  // If no top-level AND or OR, it must be a single condition
  return evaluateSingleCondition(expression, metrics);
};


const Home: React.FC = () => {
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [headerData, setHeaderData] = useState<Omit<CampaignData, 'spend' | 'ROAS' | 'CTR' | 'timestamp' | '_id' | 'createdAt' | 'updatedAt' | '__v'> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any>('');
  const [isLoading, setIsLoading] = useState<boolean>(true); // State for loading indicator
  const socketRef = useRef<any>(null);
  const [currentObject, setCurrentObject] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    // Connect to the WebSocket server on port 5000
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
      // Request initial data when connected
      socketRef.current.emit('requestCampaignData');
    });

    // Listen for loading status from the backend
    socketRef.current.on('loading', (status: boolean) => {
      console.log('Loading status received:', status);
      setIsLoading(status);
    });

    // Listen for loading complete status from the backend
    socketRef.current.on('loadingComplete', (status: boolean) => {
      console.log('Loading complete status received:', status);
      setIsLoading(status);
    });

    socketRef.current.on('campaignUpdate', (data: CampaignData[]) => {
      console.log('Received campaign update:', data);
      setCampaignData(data);
      if (data.length > 0) {
        // Extract header data from the first (most recent) entry
        const { spend, ROAS, CTR, timestamp, _id, createdAt, updatedAt, __v, ...rest } = data[0];
        setHeaderData(rest);
      }
      // Store the first observation as current Object
      const current = data[0];
      console.log("current Object:", current);
      setCurrentObject(current);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsLoading(false); // Ensure loading is off if disconnected
    });

    socketRef.current.on('connect_error', (err: Error) => {
      console.error('WebSocket connection error:', err.message);
      setIsLoading(false); // Ensure loading is off on connection error
    });

    // Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

    // useEffect to evaluate rules whenever `rules` or `currentObject` changes
  useEffect(() => {
    if (rules.length > 0 && currentObject) {
      console.log('Evaluating rules...');
      rules.forEach((rule) => {
        const conditionMet = evaluateRule(rule.rule, currentObject);
        if (conditionMet) {
          toast.success(`Action taken: ${rule.action} because of rule: "${rule.rule}"`)
          console.log(`Action taken: ${rule.action} because of rule: "${rule.rule}"`);
        }
      });
    }
  }, [rules, currentObject]); // Dependencies: rules array and currentObject


  const handleOpenModal = (content: any) => {
    console.log("modal content:", content);
    setModalContent(content);
    setModalOpen(true);
  };

  const handleModalSave = (item:any) => {
    toast.success("New Rule Added");
    console.log("new Rule Added", item);
    const currentRules = rules;
    currentRules.push(item);
    setRules(currentRules);
    setModalOpen(false);
    setModalContent('');
  };

   const handleModalClose = () => {
    
    setModalOpen(false);
    setModalContent('');
  };

  // Memoize the data for the chart to prevent unnecessary re-renders
  const chartData = React.useMemo(() => {
    // Ensure data is sorted by timestamp for the chart
    return [...campaignData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [campaignData]);


  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 font-inter">
      <h1 className="text-4xl font-bold text-center text-primary mb-8">
        Ad Campaign Dashboard
      </h1>

      {headerData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card rounded-xl shadow-custom-light p-6 mb-8 border border-gray-200"
        >
          <h2 className="text-2xl font-semibold text-text mb-4">
            Campaign Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-lightText text-sm">
            <p><strong>ID:</strong> {headerData.id}</p>
            <p><strong>Name:</strong> {headerData.name}</p>
            <p><strong>Objective:</strong> {headerData.objective}</p>
            <p><strong>Status:</strong> <span className={`font-medium ${headerData.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{headerData.status}</span></p>
            <p><strong>Effective Status:</strong> <span className={`font-medium ${headerData.effective_status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{headerData.effective_status}</span></p>
            <p><strong>Start Time:</strong> {new Date(headerData.start_time).toLocaleString()}</p>
            <p><strong>Created Time:</strong> {new Date(headerData.created_time).toLocaleString()}</p>
            <p><strong>Updated Time:</strong> {new Date(headerData.updated_time).toLocaleString()}</p>
            <p><strong>Buying Type:</strong> {headerData.buying_type}</p>
            <p><strong>Configured Status:</strong> {headerData.configured_status}</p>
            <p><strong>Source Campaign ID:</strong> {headerData.source_campaign_id}</p>
            <p><strong>Account ID:</strong> {headerData.account_id}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Graph Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative bg-card rounded-xl shadow-custom-light p-6 border border-gray-200 flex flex-col items-center justify-center min-h-[400px]"
        >
          <h2 className="text-2xl font-semibold text-text mb-4">
            Performance Trends
          </h2>
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl z-20">
              <CircularProgress color="primary" size={60} />
            </div>
          )}
          {campaignData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(isoString) =>
                    new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  stroke="#6B7280"
                />
                <YAxis yAxisId="left" stroke="#6B7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Spend') return `$${value.toFixed(2)}`;
                    if (name === 'CTR') return `${(value * 100).toFixed(2)}%`;
                    return value.toFixed(2);
                  }}
                  labelFormatter={(isoString) => new Date(isoString).toLocaleString()}
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}
                  labelStyle={{ color: '#1F2937', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  stroke="#4F46E5"
                  activeDot={{ r: 8 }}
                  name="Spend"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ROAS"
                  stroke="#6EE7B7"
                  activeDot={{ r: 8 }}
                  name="ROAS"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="CTR"
                  stroke="#FCD34D"
                  activeDot={{ r: 8 }}
                  name="CTR"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            !isLoading && ( // Only show "No data" if not loading
              <div className="flex flex-col items-center justify-center h-full text-lightText">
                <p>No data available yet.</p>
              </div>
            )
          )}
        </motion.div>

        {/* Time Series Table Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative bg-card rounded-xl shadow-custom-light p-6 border border-gray-200 overflow-hidden"
        >
          <h2 className="text-2xl font-semibold text-text mb-4">
            Data Capture History
          </h2>
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl z-20">
              <CircularProgress color="primary" size={60} />
            </div>
          )}
          <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spend
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaignData.length > 0 ? (
                  campaignData.map((entry) => (
                    <Suspense key={entry._id + '-loading'} fallback={
                      <tr key={entry._id + '-loading'} >
                        <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center">
                          <CircularProgress size={20} /> Loading row...
                        </td>
                      </tr>
                    }>
                      <LazyTableRow
                        key={entry._id}
                        entry={entry}
                        onOpenModal={handleOpenModal}
                      />
                    </Suspense>
                  ))
                ) : (
                  !isLoading && ( // Only show "No data" if not loading
                    <tr>
                      <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-lightText">
                        No data available yet.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Modal for Actions */}
      {modalOpen && modalContent && (
        <CustomModal
        open={modalOpen}
        onClose={handleModalClose}
        spend={modalContent.spend}
        roas={modalContent.ROAS}
        ctr={modalContent.CTR}
        campaignId={modalContent.id}
        onSave={handleModalSave} // Pass the save handler
      />
      )}
    </div>
  );
};

export default Home;