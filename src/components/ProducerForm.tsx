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

type ProducerFormProps = {
  initial?: {
    npn: string;
    firstName: string;
    lastName: string;
    email: string;
    callCenterLocation: string;
    employmentStatus: string;
    hireDate: string;
    queue?: string;
    classDate?: string;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
};

const ProducerForm: React.FC<ProducerFormProps> = ({
  initial,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState({
    npn: initial?.npn || "",
    firstName: initial?.firstName || "",
    lastName: initial?.lastName || "",
    email: initial?.email || "",
    callCenterLocation: initial?.callCenterLocation || "Austin",
    employmentStatus: initial?.employmentStatus || "Active",
    hireDate: initial?.hireDate || "",
    queue: initial?.queue || "",
    classDate: initial?.classDate || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any // any for Select event
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            name="npn"
            label="NPN"
            value={form.npn}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="email"
            label="Email"
            value={form.email}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="firstName"
            label="First Name"
            value={form.firstName}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="lastName"
            label="Last Name"
            value={form.lastName}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="queue"
            label="Queue"
            value={form.queue}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="classDate"
            label="Class Date"
            type="date"
            value={form.classDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel id="location-label">Call Center Location</InputLabel>
            <Select
              labelId="location-label"
              name="callCenterLocation"
              value={form.callCenterLocation}
              label="Call Center Location"
              onChange={handleChange}
            >
              <MenuItem value="Austin">Austin</MenuItem>
              <MenuItem value="Dallas">Dallas</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel id="status-label">Employment Status</InputLabel>
            <Select
              labelId="status-label"
              name="employmentStatus"
              value={form.employmentStatus}
              label="Employment Status"
              onChange={handleChange}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Terminated">Terminated</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="hireDate"
            label="Hire Date"
            type="date"
            value={form.hireDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
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

export default ProducerForm;
