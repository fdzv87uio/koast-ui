import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Modal, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';

// Define interfaces for props and data structures
interface CampaignRule {
  campaignId: string;
  action: string;
  rule: string;
}

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  spend: number;
  roas: number;
  ctr: number;
  campaignId: string;
  onSave: (newRule: CampaignRule) => void;
}

export default function CustomModal({ open, onClose, spend, roas, ctr, campaignId, onSave }: CustomModalProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [ruleInput, setRuleInput] = useState<string>('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedAction('');
      setRuleInput('');
    }
  }, [open]);

  

  const handleActionChange = (event: SelectChangeEvent<string>): void => {
    setSelectedAction(event.target.value);
  };

  const handleRuleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setRuleInput(event.target.value);
  };

  const handleSave = (): void => {
    if (selectedAction && ruleInput) {
      const newRule: CampaignRule = {
        campaignId: campaignId,
        action: selectedAction,
        rule: ruleInput, // Rule is saved as plain text
      };
      onSave(newRule); // Call the onSave prop to handle saving to localStorage
    } else {
      // In a real app, you might show a more user-friendly error message
      console.warn("Please select an action and define a rule before saving.");
    }
  };

  return (
    <>
      {open && (
        <Modal
          open={open}
          onClose={onClose}
          aria-labelledby="custom-modal-title"
          aria-describedby="custom-modal-description"
          closeAfterTransition
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-card bg-white rounded-xl shadow-custom-medium p-6 w-11/12 max-w-md border border-gray-200"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="custom-modal-title" className="text-xl font-semibold text-text">
                Define Action Rule
              </h3>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </div>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="action-select-label">Select Action</InputLabel>
                <Select
                  labelId="action-select-label"
                  id="action-select"
                  value={selectedAction}
                  label="Select Action"
                  onChange={handleActionChange}
                  className="rounded-lg"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="Pausing campaigns">Pausing campaigns</MenuItem>
                  <MenuItem value="Adjusting budgets">Adjusting budgets</MenuItem>
                  <MenuItem value="Logging events">Logging events</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {selectedAction && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" className="text-text mb-5 font-medium">
                  Define Logic Condition:
                </Typography>
                <TextField
                  id="rule-input"
                  label="Rule (e.g., IF (Spend > $500 AND CTR < 1%) OR (ROAS < 2))"
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                  value={ruleInput}
                  onChange={handleRuleInputChange}
                  placeholder={`Current Data: Spend ($${spend}), ROAS (${roas}), CTR (${(ctr * 100).toFixed(2)}%), Campaign ID (${campaignId})`}
                  className="rounded-lg"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.75rem', // rounded-xl
                    },
                  }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                  Example: `IF (Spend {'>'} $500 AND CTR {'<'} 1%) OR (ROAS {'<'} 2)`
                </Typography>
              </Box>
            )}

            <div className="flex flex-row gap-5 justify-end space-x-3">
              <Button
                variant="outlined"
                onClick={onClose}
                className="py-2 px-4 rounded-lg transition-colors duration-200"
                sx={{
                  color: '#666666',
                  borderColor: '#cccccc',
                  '&:hover': {
                    borderColor: '#999999',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  textTransform: 'none',
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!selectedAction || !ruleInput}
                className="py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                  '&:disabled': {
                    backgroundColor: '#e0e0e0',
                    color: '#a0a0a0',
                  },
                  textTransform: 'none',
                }}
              >
                Save Rule
              </Button>
            </div>
          </motion.div>
        </Modal>
      )}
    </>
  );
}