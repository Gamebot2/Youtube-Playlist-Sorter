import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Container,
    Box,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Grid,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from './AuthContext';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

function SortPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [playlist, setPlaylist] = useState(location.state?.playlist);
    const [items, setItems] = useState([]);
    const [sortBy, setSortBy] = useState('title');
    const [order, setOrder] = useState('asc');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSorting, setIsSorting] = useState(false);
    const [hasManualOrder, setHasManualOrder] = useState(false);

    useEffect(() => {
        if (!playlist) {
            navigate('/');
            return;
        }

        fetchPlaylistItems();
    }, [playlist]);

    useEffect(() => {
        // Sort items locally when sort options change
        if (!hasManualOrder) {
            setItems(prevItems => {
                const sortedItems = [...prevItems];
                sortedItems.sort((a, b) => {
                    let comparison = 0;
                    if (sortBy === 'title') {
                        comparison = (a.snippet?.title || '').localeCompare(b.snippet?.title || '');
                    } else if (sortBy === 'date') {
                        const dateA = new Date(a.snippet?.publishedAt || 0);
                        const dateB = new Date(b.snippet?.publishedAt || 0);
                        comparison = dateA - dateB;
                    } else if (sortBy === 'channel') {
                        comparison = (a.snippet?.videoOwnerChannelTitle || '').localeCompare(b.snippet?.videoOwnerChannelTitle || '');
                    }
                    return order === 'asc' ? comparison : -comparison;
                });
                return sortedItems;
            });
        }
    }, [sortBy, order, hasManualOrder]);

    const fetchPlaylistItems = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get('http://localhost:5000/api/playlist-items', {
                params: {
                    playlist_id: playlist.id
                },
                withCredentials: true
            });
            setItems(response.data.items);
        } catch (error) {
            console.error('Error fetching playlist items:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = async () => {
        try {
            setIsSorting(true);
            const response = await axios.post('http://localhost:5000/api/sort', {
                playlist_id: playlist.id,
                sort_by: sortBy,
                order: order,
                new_playlist_name: newPlaylistName,
                create_playlist: true
            }, {
                withCredentials: true
            });

            if (response.data.new_playlist_id) {
                alert('New playlist created successfully!');
                navigate('/');
            }
        } catch (error) {
            console.error('Error sorting playlist:', error);
            alert('Error creating sorted playlist. Please try again.');
        } finally {
            setIsSorting(false);
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const itemsCopy = Array.from(items);
        const [reorderedItem] = itemsCopy.splice(result.source.index, 1);
        itemsCopy.splice(result.destination.index, 0, reorderedItem);

        setItems(itemsCopy);
        setHasManualOrder(true);
    };

    const handleSortByChange = (e) => {
        setSortBy(e.target.value);
        setHasManualOrder(false);
    };

    const handleOrderChange = (e) => {
        setOrder(e.target.value);
        setHasManualOrder(false);
    };

    if (!isAuthenticated) {
        return (
            <Container maxWidth="md">
                <Box sx={{ my: 4, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                        Please login to continue
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        You need to be logged in to sort playlists.
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Sort Playlist: {playlist?.snippet.title}
                </Typography>

                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Sort By</InputLabel>
                                <Select
                                    value={sortBy}
                                    onChange={handleSortByChange}
                                    label="Sort By"
                                >
                                    <MenuItem value="title">Title</MenuItem>
                                    <MenuItem value="date">Date</MenuItem>
                                    <MenuItem value="channel">Channel Name</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Order</InputLabel>
                                <Select
                                    value={order}
                                    onChange={handleOrderChange}
                                    label="Order"
                                >
                                    <MenuItem value="asc">Ascending</MenuItem>
                                    <MenuItem value="desc">Descending</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="New Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSort}
                                disabled={isSorting || !newPlaylistName}
                                fullWidth
                            >
                                {isSorting ? <CircularProgress size={24} /> : "Create Sorted Playlist"}
                            </Button>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Paper elevation={2}>
                                <Box sx={{
                                    maxHeight: 'calc(100vh - 200px)',
                                    overflow: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#888',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb:hover': {
                                        background: '#555',
                                    }
                                }}>
                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <Droppable droppableId="playlist-items">
                                            {(provided) => (
                                                <List {...provided.droppableProps} ref={provided.innerRef}>
                                                    {items.map((item, index) => (
                                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                                            {(provided) => (
                                                                <ListItem
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    sx={{
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                                        },
                                                                    }}
                                                                >
                                                                    <IconButton
                                                                        {...provided.dragHandleProps}
                                                                        sx={{
                                                                            mr: 1,
                                                                            color: 'text.secondary',
                                                                            '&:hover': {
                                                                                backgroundColor: 'transparent',
                                                                            },
                                                                        }}
                                                                    >
                                                                        <DragIndicatorIcon />
                                                                    </IconButton>
                                                                    <ListItemAvatar>
                                                                        <Avatar
                                                                            variant="rounded"
                                                                            src={item.snippet.thumbnails?.default?.url}
                                                                            sx={{ width: 120, height: 68 }}
                                                                        />
                                                                    </ListItemAvatar>
                                                                    <ListItemText
                                                                        primary={item.snippet.title}
                                                                        secondary={
                                                                            <>
                                                                                <Typography variant="body2" component="span">
                                                                                    {item.snippet.videoOwnerChannelTitle}
                                                                                </Typography>
                                                                                <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                                                                    {new Date(item.snippet.publishedAt).toLocaleDateString()}
                                                                                </Typography>
                                                                            </>
                                                                        }
                                                                        sx={{ ml: 2 }}
                                                                    />
                                                                </ListItem>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </List>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                </Box>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

export default SortPage; 