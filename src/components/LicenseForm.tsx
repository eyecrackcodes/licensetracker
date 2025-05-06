import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";

type LicenseFormProps = {
  initial?: {
    licenseNumber: string;
    state: string;
    linesOfAuthority: string[];
    status: string;
    issueDate: string;
    expirationDate?: string;
    note?: string;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
};

const LicenseForm: React.FC<LicenseFormProps> = ({
  initial,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState({
    licenseNumber: initial?.licenseNumber || "",
    state: initial?.state || "",
    linesOfAuthority: initial?.linesOfAuthority?.join(", ") || "",
    status: initial?.status || "Active",
    issueDate: initial?.issueDate || "",
    expirationDate: initial?.expirationDate || "",
    note: initial?.note || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      linesOfAuthority: form.linesOfAuthority
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      expirationDate: form.expirationDate || undefined,
      note: form.note || undefined,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            name="licenseNumber"
            label="License Number"
            value={form.licenseNumber}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="state"
            label="State"
            value={form.state}
            onChange={handleChange}
            fullWidth
            required
            inputProps={{ maxLength: 2 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            name="linesOfAuthority"
            label="Lines of Authority (comma separated)"
            value={form.linesOfAuthority}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              name="status"
              value={form.status}
              label="Status"
              onChange={handleChange}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
              <MenuItem value="Revoked">Revoked</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="note"
            label="Note (e.g., Z, PP)"
            value={form.note}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="issueDate"
            label="Issue Date"
            type="date"
            value={form.issueDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="expirationDate"
            label="Expiration Date (Optional)"
            type="date"
            value={form.expirationDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
        <Button type="submit" variant="contained">
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
};

export default LicenseForm;
