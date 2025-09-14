import { Card } from '@/components/ui/card';
import { usePlayer, usePlayerState, usePlaylist } from '@/context/MusicContext';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/context/ToastContext';
import { Song } from '@/types/song';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SwipeableModal from '../common/SwipeableModal';
import AddToPlaylist from './AddToPlaylist';

interface PlayerDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  song: Song;
}

const NewPlayerDrawer: React.FC<PlayerDrawerProps> = ({ isVisible, onClose, song }) => {
  const { colors } = useTheme();
  const [playlistModal, setPlaylistModal] = useState(false);
  const { addToQueue, removeFromQueue } = usePlayer();
  const { currentSong } = usePlayerState();
  const { playlist } = usePlaylist();

  const artistName = song.artist_map?.artists || [{ name: 'Unknown Artist', id: null }];
  const albumArt = song.image?.[2]?.link || song.image?.[1]?.link;

  const handlePress = (id: string, path: string) => {
    onClose();
    router.push({
      pathname: path as any,
      params: { id },
    });
  };

  const paths = {
    artist: '/artist',
    albums: '/albums',
  };

  const isSongInQueue = playlist.some((item) => item.id === song.id);

  const handleAddToQueue = () => {
    if (isSongInQueue) {
      removeFromQueue(song.id);
      toast('Removed from Queue');
    } else {
      addToQueue(song);
      toast('Added to Queue');
    }
    onClose();
  };

  return (
    <>
      <SwipeableModal isVisible={isVisible} onClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header - Current Song Info */}
          <View style={styles.headerContainer}>
            <Card variant='default' className='overflow-hidden' style={styles.albumArtContainer}>
              <Image source={{ uri: albumArt }} style={styles.albumArt} resizeMode='cover' />
            </Card>
            <View style={styles.songInfoContainer}>
              <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={1}>
                {song.name}
              </Text>
              <Text
                style={[styles.artistName, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {artistName?.[0].name}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.muted }]}
              onPress={onClose}
            >
              <Feather name='x' size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Add to Queue */}
            {currentSong?.id !== song.id && (
              <TouchableOpacity
                style={[styles.optionRow, { backgroundColor: colors.card }]}
                onPress={handleAddToQueue}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                  <MaterialIcons name='queue-music' size={22} color={colors.foreground} />
                </View>
                <Text style={[styles.optionText, { color: colors.foreground }]}>
                  {isSongInQueue ? 'Remove from Queue' : 'Add to Queue'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Add to Playlist */}
            <TouchableOpacity
              style={[styles.optionRow, { backgroundColor: colors.card }]}
              onPress={() => setPlaylistModal(true)}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                <MaterialIcons name='playlist-add' size={22} color={colors.foreground} />
              </View>
              <Text style={[styles.optionText, { color: colors.foreground }]}>Add to Playlist</Text>
            </TouchableOpacity>

            {/* View Artist */}
            {artistName?.[0].id && (
              <TouchableOpacity
                style={[styles.optionRow, { backgroundColor: colors.card }]}
                onPress={() => handlePress(artistName?.[0].id, paths.artist)}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                  <Ionicons name='person-outline' size={20} color={colors.foreground} />
                </View>
                <Text style={[styles.optionText, { color: colors.foreground }]}>View Artist</Text>
              </TouchableOpacity>
            )}

            {/* View Album */}
            {song?.album_id && (
              <TouchableOpacity
                style={[styles.optionRow, { backgroundColor: colors.card }]}
                onPress={() => handlePress(song.album_id, paths.albums)}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                  <Ionicons name='disc-outline' size={20} color={colors.foreground} />
                </View>
                <Text style={[styles.optionText, { color: colors.foreground }]}>View Album</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SwipeableModal>
      {playlistModal && (
        <AddToPlaylist
          dialogOpen={playlistModal}
          setDialogOpen={() => setPlaylistModal(false)}
          song={song}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  albumArtContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  songInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  optionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default NewPlayerDrawer;
