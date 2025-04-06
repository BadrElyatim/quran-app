import React, { useEffect, useState, useRef } from "react";

const QuranAudioPlayer = ({ surahNumber, reciterId = 7, audioRef, onPlay }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [verseTimestamps, setVerseTimestamps] = useState([]);
    const [currentVerseIndex, setCurrentVerseIndex] = useState(null);
    // Add this state to track when we're actively dragging
    const [isDragging, setIsDragging] = useState(false);
    // Optionally add a temporary value for drag position
    const [dragPosition, setDragPosition] = useState(0);

    // Start dragging
    const handleDragStart = () => {
        setIsDragging(true);
        // Store initial drag position
        setDragPosition(currentTime);
    };

    // During drag
    const handleDrag = (e) => {
        if (isDragging) {
            const newPosition = parseFloat(e.target.value);
            setDragPosition(newPosition);
        }
    };

    // End dragging
    const handleDragEnd = () => {
        if (isDragging) {
            // Apply the new position to the audio
            audioRef.current.currentTime = dragPosition;
            setIsDragging(false);
        }
    };

    const animationFrameRef = useRef(null);

    // Format time in MM:SS format
    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            audioRef.current.pause();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Reset when surah changes
    useEffect(() => {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsLoading(false);
        setCurrentTime(0);
        setDuration(0);
        setCurrentVerseIndex(null);
        setVerseTimestamps([]);

        // Load audio URLs for the current surah
        loadAudioUrl();
    }, [surahNumber, reciterId]);

    // Set up audio event listeners
    useEffect(() => {
        const audio = audioRef.current;

        const handleTimeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(audio.currentTime);
            }

            // Find which verse corresponds to current time
            if (verseTimestamps.length > 0) {
                let index = 0;
                for (let i = 0; i < verseTimestamps.length; i++) {
                    if (i < verseTimestamps.length - 1) {
                        if (audio.currentTime >= verseTimestamps[i] && audio.currentTime < verseTimestamps[i + 1]) {
                            index = i + 1; // +1 because verse indices start from 1
                            break;
                        }
                    } else if (audio.currentTime >= verseTimestamps[i]) {
                        index = i + 1;
                    }
                }

                if (currentVerseIndex !== index) {
                    setCurrentVerseIndex(index);
                }
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setCurrentVerseIndex(null);
        };

        // Add pause event listener to update the UI when audio is paused externally
        const handlePause = () => {
            setIsPlaying(false);
        };

        // Add play event listener to update the UI when audio is played
        const handlePlay = () => {
            setIsPlaying(true);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
        };
    }, [verseTimestamps, currentVerseIndex]);

    // Load audio URL for the current surah
    const loadAudioUrl = async () => {
        setIsLoading(true);

        try {
            // Fetch audio URL from Quran.com API
            const response = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahNumber}`);
            if (!response.ok) {
                throw new Error('Failed to fetch audio data');
            }

            const data = await response.json();
            const audioUrl = data.audio_file.audio_url;

            // Fetch timestamps for each verse
            const timestampsResponse = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${surahNumber}`);
            if (!timestampsResponse.ok) {
                throw new Error('Failed to fetch timestamp data');
            }

            const timestampsData = await timestampsResponse.json();
            const verses = timestampsData.audio_files;

            // Set the main audio URL
            audioRef.current.src = audioUrl;

            // Extract timestamps for each verse
            const timestamps = verses.map(verse => verse.timestamp_from);
            setVerseTimestamps(timestamps);

            // Preload the audio
            audioRef.current.load();

        } catch (error) {
            console.error("Error loading audio data:", error);
            setIsLoading(false);
        }
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // If there's a callback to pause individual verse playback, call it
            if (onPlay && typeof onPlay === 'function') {
                onPlay();
            }

            audioRef.current.play().catch(err => {
                console.error("Error playing audio:", err);
            });
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        audioRef.current.volume = newVolume;
    };

    return (
        <div className="mt-6 mb-4 p-4 bg-green-50 rounded-lg shadow-md">
            <div className="text-center mb-2 text-green-800 font-semibold">
                Surah {surahNumber} {currentVerseIndex ? ` - Verse ${currentVerseIndex}` : ''}
            </div>

            {/* Progress bar */}
            <div className="flex items-center space-x-2 mb-3">
                <span className="text-xs text-green-800">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={isDragging ? dragPosition : currentTime}
                    onMouseDown={handleDragStart}
                    onChange={handleDrag}
                    onMouseUp={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDrag}
                    onTouchEnd={handleDragEnd}
                    className="flex-grow h-2 appearance-none bg-green-200 rounded-full outline-none"
                    style={{
                        backgroundImage: `linear-gradient(to right, #10B981 0%, #10B981 ${(isDragging ? dragPosition : currentTime) / (duration || 1) * 100}%, #D1FAE5 ${(isDragging ? dragPosition : currentTime) / (duration || 1) * 100}%)`,
                    }}
                    disabled={!audioRef.current.src}
                />
                <span className="text-xs text-green-800">{formatTime(duration)}</span>
            </div>

            {/* Player controls */}
            <div className="flex items-center justify-between">
                {/* Play/Pause button */}
                <button
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : isPlaying ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </button>

                {/* Volume control */}
                <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 appearance-none bg-green-200 rounded-full outline-none"
                        style={{
                            backgroundImage: `linear-gradient(to right, #10B981 0%, #10B981 ${volume * 100}%, #D1FAE5 ${volume * 100}%)`,
                        }}
                    />
                </div>
            </div>

            {/* Instructions for users */}
            <div className="text-center text-xs text-green-600 mt-3">
                {isLoading ? "Loading audio..." : "Click on any verse text to play just that verse"}
            </div>
        </div>
    );
};

export default QuranAudioPlayer;