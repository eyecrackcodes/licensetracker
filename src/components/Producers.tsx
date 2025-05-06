import React, { useState } from "react";
import ProducerForm from "./ProducerForm.tsx";
import ProducerLicenseGrid from "./ProducerLicenseGrid.tsx";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Modal,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility"; // Icon for view/edit licenses

// Assuming firebaseService types - replace with actual import later
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

const placeholderProducers: Producer[] = [
  {
    id: "1",
    npn: "1234567",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    callCenterLocation: "Austin",
    employmentStatus: "Active",
    hireDate: "2022-01-15",
    queue: "P",
    classDate: "2024-11-11",
  },
  {
    id: "2",
    npn: "7654321",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    callCenterLocation: "Dallas",
    employmentStatus: "Terminated",
    hireDate: "2021-06-10",
    queue: "T",
    classDate: "2024-12-16",
  },
];

const placeholderLicenses: License[] = [
  {
    id: "l1",
    producerId: "1",
    licenseNumber: "TX-12345",
    state: "TX",
    linesOfAuthority: ["Life", "Health"],
    status: "Active",
    issueDate: "2022-01-20",
    expirationDate: "2024-01-20",
    note: "X",
  },
  {
    id: "l2",
    producerId: "1",
    licenseNumber: "CA-54321",
    state: "CA",
    linesOfAuthority: ["Property"],
    status: "Expired",
    issueDate: "2020-05-10",
    expirationDate: "2022-05-10",
    note: "Z",
  },
  {
    id: "l3",
    producerId: "2",
    licenseNumber: "TX-99999",
    state: "TX",
    linesOfAuthority: ["Life"],
    status: "Active",
    issueDate: "2021-01-01",
    expirationDate: "2023-01-01",
    note: "X",
  },
];

// Style for modals
const modalStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%", // Adjust width as needed
  maxWidth: 900,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  overflowY: "auto",
  maxHeight: "90vh",
};

const Producers: React.FC = () => {
  // Replace with Firebase loading state later
  const [loading, setLoading] = useState(false);
  const [producers, setProducers] = useState<Producer[]>(placeholderProducers);
  const [licenses, setLicenses] = useState<License[]>(placeholderLicenses);
  const [showProducerModal, setShowProducerModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editProducer, setEditProducer] = useState<Producer | null>(null);
  const [licenseGridProducer, setLicenseGridProducer] =
    useState<Producer | null>(null);

  const handleAddProducer = () => {
    setEditProducer(null);
    setShowProducerModal(true);
  };

  const handleEditProducer = (producer: Producer) => {
    setEditProducer(producer);
    setShowProducerModal(true);
  };

  const handleDeleteProducer = (id: string) => {
    console.log("Deleting producer (placeholder):", id);
    // Replace with Firebase call
    setProducers((prev) => prev.filter((p) => p.id !== id));
    setLicenses((prev) => prev.filter((l) => l.producerId !== id));
  };

  const handleSaveProducer = (data: any) => {
    console.log("Saving producer (placeholder):", data);
    // Replace with Firebase call
    if (editProducer) {
      setProducers((prev) =>
        prev.map((p) => (p.id === editProducer.id ? { ...p, ...data } : p))
      );
    } else {
      const newId = Math.random().toString(36).slice(2);
      setProducers((prev) => [...prev, { ...data, id: newId }]);
    }
    setShowProducerModal(false);
  };

  const handleLicenseGrid = (producer: Producer) => {
    setLicenseGridProducer(producer);
    setShowLicenseModal(true);
  };

  const handleLicenseGridSave = (data: any) => {
    console.log("Saving license (placeholder):", data);
    // Replace with Firebase call
    setLicenses((prev) => {
      const existing = prev.find(
        (l) =>
          l.producerId === licenseGridProducer?.id && l.state === data.state
      );
      if (existing) {
        return prev.map((l) =>
          l.producerId === licenseGridProducer?.id && l.state === data.state
            ? { ...l, ...data, producerId: licenseGridProducer?.id }
            : l
        );
      } else {
        return [
          ...prev,
          {
            ...data,
            id: Math.random().toString(36).slice(2),
            producerId: licenseGridProducer?.id,
          },
        ];
      }
    });
    // Note: Keep the license grid modal open after saving one state
    // setShowLicenseModal(false); // Don't close automatically
  };

  return (
    <Paper sx={{ width: "100%", mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", p: 2 }}>
        <Typography variant="h6">Producers</Typography>
        <Button variant="contained" onClick={handleAddProducer}>
          Add Producer
        </Button>
      </Box>
      <TableContainer>
        {loading ? (
          <CircularProgress sx={{ display: "block", margin: "auto", my: 4 }} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>NPN</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Queue</TableCell>
                <TableCell>Class Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell>Licenses</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {producers.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.npn}</TableCell>
                  <TableCell>
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.queue || ""}</TableCell>
                  <TableCell>{p.classDate || ""}</TableCell>
                  <TableCell>{p.callCenterLocation}</TableCell>
                  <TableCell>{p.employmentStatus}</TableCell>
                  <TableCell>{p.hireDate}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleLicenseGrid(p)}
                      title="View/Edit Licenses"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditProducer(p)}
                      title="Edit Producer"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteProducer(p.id)}
                      title="Delete Producer"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Producer Add/Edit Modal */}
      <Modal
        open={showProducerModal}
        onClose={() => setShowProducerModal(false)}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            {editProducer ? "Edit Producer" : "Add Producer"}
          </Typography>
          <ProducerForm
            initial={editProducer || undefined}
            onSave={handleSaveProducer}
            onCancel={() => setShowProducerModal(false)}
          />
        </Box>
      </Modal>

      {/* License Grid Modal */}
      <Modal open={showLicenseModal} onClose={() => setShowLicenseModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Licenses for {licenseGridProducer?.firstName}{" "}
            {licenseGridProducer?.lastName}
          </Typography>
          {licenseGridProducer && (
            <ProducerLicenseGrid
              producer={licenseGridProducer}
              licenses={licenses.filter(
                (l) => l.producerId === licenseGridProducer?.id
              )}
              onSave={handleLicenseGridSave}
            />
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button onClick={() => setShowLicenseModal(false)}>Close</Button>
          </Box>
        </Box>
      </Modal>
    </Paper>
  );
};

export default Producers;
