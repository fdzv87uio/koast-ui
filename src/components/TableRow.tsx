/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion } from 'framer-motion';
import { IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface CampaignData {
  _id: string;
  id: string;
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
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface TableRowProps {
  entry: CampaignData;
  onOpenModal: (content: any) => void;
}

const TableRow: React.FC<TableRowProps> = ({ entry, onOpenModal }) => {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hover:bg-gray-50"
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
        {new Date(entry.timestamp).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-lightText">
        ${entry.spend.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-lightText">
        {entry.ROAS}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-lightText">
        {(entry.CTR * 100).toFixed(2)}%
      </td>
      <td className="px-6 py-4 flex flex-col items-center whitespace-nowrap text-right text-sm font-medium">
        <IconButton
          aria-label="edit"
          size="small"
          onClick={() => onOpenModal(entry)}
          className="text-accent hover:text-accent-dark mr-2"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </td>
    </motion.tr>
  );
};

export default TableRow;
