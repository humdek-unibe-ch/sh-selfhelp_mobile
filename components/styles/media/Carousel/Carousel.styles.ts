/**
 * Static visual chunks for the carousel. The page snap behaviour
 * computes width at runtime from `Dimensions.get('window')`; everything
 * else lives here so the render file stays declarative.
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    page: {
        paddingHorizontal: 16,
    },
    image: {
        width: '100%',
        height: 220,
        borderRadius: 4,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    dotBase: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
    dotActive: {
        backgroundColor: '#228be6',
    },
    dotInactive: {
        backgroundColor: '#dee2e6',
    },
    arrowsOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    arrowButton: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    arrowLeft: { marginLeft: 4 },
    arrowRight: { marginRight: 4 },
    arrowText: {
        color: '#fff',
        fontWeight: '700',
    },
});
