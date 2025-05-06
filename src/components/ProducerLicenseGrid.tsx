import React, { useState } from "react";
import LicenseForm from "./LicenseForm.tsx";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography,
  Modal,
} from "@mui/material";

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

type License = {
  id: string;
  producerId: string;
  licenseNumber: string;
  state: string;
  linesOfAuthority: string[];
  status: string;
  issueDate: string;
  expirationDate?: string;
  note?: string;
};

type Producer = {
  id: string;
  firstName: string;
  lastName: string;
};

type Props = {
  producer: Producer;
  licenses: License[];
  onSave: (license: Partial<License> & { state: string }) => void;
};

// Style for modal form
const modalStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "60%", // Adjust width as needed
  maxWidth: 600,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const ProducerLicenseGrid: React.FC<Props> = ({
  producer,
  licenses,
  onSave,
}) => {
  const [editState, setEditState] = useState<string | null>(null);
  const [editLicense, setEditLicense] = useState<License | null>(null);

  const handleCellClick = (state: string) => {
    const license = licenses.find((l) => l.state === state);
    setEditState(state);
    setEditLicense(license || null);
  };

  const handleSave = (data: any) => {
    onSave({ ...data, state: editState! });
    setEditState(null);
    setEditLicense(null);
  };

  const handleCloseModal = () => {
    setEditState(null);
    setEditLicense(null);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
        {" "}
        {/* Limit height and make scrollable */}
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {US_STATES.map((state) => (
                <TableCell
                  key={state}
                  align="center"
                  sx={{ minWidth: 40, p: 0.5 }}
                >
                  {state}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow hover>
              {US_STATES.map((state) => {
                const license = licenses.find((l) => l.state === state);
                const cellContent = license
                  ? license.note || license.status[0]
                  : "";
                const tooltipTitle = license
                  ? `Status: ${license.status}\nNote: ${
                      license.note || ""
                    }\nExpires: ${license.expirationDate || "N/A"}`
                  : `Add ${state} License`;
                return (
                  <Tooltip title={tooltipTitle} key={state}>
                    <TableCell
                      align="center"
                      sx={{
                        border: "1px solid #eee",
                        p: 0.5,
                        cursor: "pointer",
                        bgcolor: license ? "lightblue" : "inherit",
                        "&:hover": {
                          bgcolor: license ? "blue" : "lightgray",
                          color: license ? "white" : "black",
                        },
                      }}
                      onClick={() => handleCellClick(state)}
                    >
                      {cellContent}
                    </TableCell>
                  </Tooltip>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* License Add/Edit Form Modal */}
      <Modal
        open={!!editState} // Open when editState is not null
        onClose={handleCloseModal}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            {editLicense
              ? `Edit ${editState} License`
              : `Add ${editState} License`}
          </Typography>
          <LicenseForm
            initial={editLicense || undefined}
            onSave={handleSave}
            onCancel={handleCloseModal}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default ProducerLicenseGrid;
