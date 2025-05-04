import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Paper,
    IconButton,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import axios from 'axios';
import SortPage from './SortPage';
import { ThemeContext, ThemeProvider } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';

function ThemeToggle() {
    const { darkMode, toggleTheme } = React.useContext(ThemeContext);
    return (
        <Tooltip title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
            <IconButton onClick={toggleTheme} color="inherit">
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
        </Tooltip>
    );
}

function AuthButton() {
    const { isAuthenticated, login, logout, isLoading } = useAuth();
    return (
        <Button
            variant="contained"
            color={isAuthenticated ? "secondary" : "primary"}
            onClick={isAuthenticated ? logout : login}
            disabled={isLoading}
        >
            {isLoading ? <CircularProgress size={24} /> : (isAuthenticated ? "Log out" : "Log in")}
        </Button>
    );
}

function HomePage() {
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [channelId, setChannelId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const fetchPlaylists = useCallback(async () => {
        if (!channelId) return;

        try {
            setIsLoading(true);
            const response = await axios.get('http://localhost:5000/api/playlists', {
                params: {
                    channel_id: channelId
                },
                withCredentials: true
            });
            setPlaylists(response.data.items);
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            setIsLoading(false);
        }
    }, [channelId]);

    useEffect(() => {
        if (location.state?.channelId) {
            setChannelId(location.state.channelId);
        }
    }, [location.state]);

    useEffect(() => {
        if (channelId) {
            fetchPlaylists();
        }
    }, [channelId, fetchPlaylists]);

    const handlePlaylistSelect = (playlist) => {
        setSelectedPlaylist(playlist);
        navigate('/sort', { state: { playlist, channelId } });
    };

    if (!isAuthenticated) {
        return (
            <Container maxWidth="md">
                <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" component="h1" gutterBottom>
                        YouTube Playlist Sorter
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <ThemeToggle />
                        <AuthButton />
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'center', mt: 8 }}>
                    <Typography variant="h5" gutterBottom>
                        Please login to continue
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        You need to be logged in to access and sort playlists.
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    YouTube Playlist Sorter
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <ThemeToggle />
                    <AuthButton />
                </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    label="YouTube Channel ID"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    helperText="Enter the YouTube channel ID to fetch playlists"
                    sx={{ mb: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={fetchPlaylists}
                    disabled={!channelId || isLoading}
                >
                    {isLoading ? <CircularProgress size={24} /> : "Fetch playlists"}
                </Button>
            </Box>

            {playlists.length > 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Playlists
                    </Typography>
                    <Paper elevation={2}>
                        <List>
                            {playlists.map((playlist) => (
                                <ListItem
                                    key={playlist.id}
                                    button
                                    onClick={() => handlePlaylistSelect(playlist)}
                                    selected={selectedPlaylist?.id === playlist.id}
                                >
                                    <ListItemAvatar>
                                        <Avatar
                                            variant="rounded"
                                            src={playlist.snippet.thumbnails?.default?.url}
                                            sx={{ width: 120, height: 68 }}
                                        />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={playlist.snippet.title}
                                        secondary={`${playlist.contentDetails.itemCount} videos`}
                                        sx={{ ml: 2 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>
            )}
        </Container>
    );
}

function App() {
    const { theme } = React.useContext(ThemeContext);

    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/sort" element={<SortPage />} />
                </Routes>
            </Router>
        </MuiThemeProvider>
    );
}

export default function AppWrapper() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ThemeProvider>
    );
} 