import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react-native';

const COLORS = {
  primary: '#F472B6',
  background: '#0B0B0C',
  surface: '#1A1A1D',
  text: '#FFFFFF',
  textMuted: '#9CA3AF'
};

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function QRScannerModal({ visible, onClose, onScan }: QRScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = "qr-reader-element";

  useEffect(() => {
    if (visible) {
      setError(null);
      setIsInitializing(true);
      // Initialize scanner after a short delay to ensure modal is rendered
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [visible]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(scannerElementId);
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Await stop before calling onScan to avoid camera/screen flash race condition
          if (scannerRef.current) {
            try {
              await scannerRef.current.stop();
              scannerRef.current.clear();
              scannerRef.current = null;
            } catch (e) {}
          }
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore general scan failures (empty frames etc)
        }
      );
      setIsInitializing(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Brak dostępu do kamery. Upewnij się, że udzieliłeś zgody.");
      setIsInitializing(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(err => console.error("Failed to stop scanner", err));
      } catch(e) {}
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Skanuj kod z tabletu</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X color={COLORS.textMuted} size={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.scannerContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Camera color={COLORS.textMuted} size={48} style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={startScanner}>
                  <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View id={scannerElementId} style={styles.readerElement} />
                {isInitializing && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Uruchamianie kamery...</Text>
                  </View>
                )}
              </>
            )}
          </View>
          
          <Text style={styles.hint}>
            Skieruj aparat na ekran tabletu w recepcji tak, aby kod QR znalazł się w ramce.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 5
  },
  scannerContainer: {
    width: 250,
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  readerElement: {
    width: '100%',
    height: '100%'
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: {
    color: COLORS.primary,
    marginTop: 10,
    fontWeight: 'bold'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 15
  },
  retryBtn: {
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  retryBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold'
  },
  hint: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20
  }
});
