import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { s, vs, ms, fs } from '../utils/scale';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  FadeInDown
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '../../assets/icon.png';
import { useServices } from '../context/ServiceContext';
import { useConfig } from '../context/ConfigContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listNotifications } from '../api/endpoints';

const { width } = Dimensions.get('window');


export default function TopMenu() {
  const { services, collapsed, toggleCollapsed, selected, selectService } = useServices();
  const { config } = useConfig();
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = React.useState(0);
  const normalizeBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
    return undefined;
  };
  const menuEnabled = normalizeBool(config?.topMenuEnabled) ?? true;

  // Shared values for animations
  const heightSv = useSharedValue(collapsed ? 0 : 120);
  const opacitySv = useSharedValue(collapsed ? 0.0 : 1);
  const arrowRotation = useSharedValue(collapsed ? 0 : 180);
  const translateSv = useSharedValue(collapsed ? -12 : 0);
  const scaleSv = useSharedValue(collapsed ? 0.98 : 1);

  const scrollRef = useRef(null);
  const positionsRef = useRef({});

  useEffect(() => {
    heightSv.value = withTiming(collapsed ? 0 : 120, { duration: 140, easing: Easing.out(Easing.cubic) });
    opacitySv.value = withTiming(collapsed ? 0.0 : 1, { duration: 120, easing: Easing.out(Easing.cubic) });
    translateSv.value = withTiming(collapsed ? -12 : 0, { duration: 140, easing: Easing.out(Easing.cubic) });
    scaleSv.value = withTiming(collapsed ? 0.98 : 1, { duration: 140, easing: Easing.out(Easing.cubic) });
    arrowRotation.value = withTiming(collapsed ? 0 : 180, { duration: 140, easing: Easing.out(Easing.cubic) });

    if (!collapsed && selected?.id) {
      // Small delay to allow expansion before scrolling
      setTimeout(() => scrollToId(selected.id), 100);
    }
  }, [collapsed]);

  useEffect(() => {
    if (selected?.id) {
      scrollToId(selected.id);
    }
  }, [selected]);
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await listNotifications();
        if (response.data && Array.isArray(response.data)) {
          const count = response.data.filter(n => !n.is_read).length;
          setUnread(count);
        } else {
          setUnread(0);
        }
      } catch (_) {
        setUnread(0);
      }
    };

    fetchUnreadCount();
    const unsubscribe = navigation.addListener('focus', fetchUnreadCount);
    return unsubscribe;
  }, [navigation, isAuthenticated]);

  const scrollToId = (id) => {
    const pos = positionsRef.current[id];
    if (!pos || !scrollRef.current) return;

    const centerOffset = Math.max(0, pos.x - (width / 2) + (pos.width / 2));
    scrollRef.current.scrollTo({ x: centerOffset, animated: true });
  };

  const containerStyle = useAnimatedStyle(() => ({
    height: heightSv.value,
    opacity: opacitySv.value,
    transform: [
      { translateY: translateSv.value },
      { scale: scaleSv.value },
    ],
  }));



  const visibleServices = Array.isArray(services) ? services.filter((svc) => !!svc?.active) : [];
  return (
    <View style={[styles.wrapper]} pointerEvents="box-none">
      <View style={styles.header}>
        {menuEnabled ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(() => {
              if (global.__topMenuLock) return;
              global.__topMenuLock = true;
              toggleCollapsed();
              setTimeout(() => { global.__topMenuLock = false; }, 200);
            })}
            style={styles.menuToggleBtn}
          >
            <Ionicons name={collapsed ? 'menu' : 'close'} size={22} color="#1a1a1a" />
          </TouchableOpacity>
        ) : (
          <View style={styles.menuToggleBtn} />
        )}

        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>Premium <Text style={styles.brandHighlight}>Vale</Text></Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.notificationButton}
          onPress={() => {
            if (!isAuthenticated) {
              navigation.navigate('Login');
              return;
            }
            navigation.navigate('Notifications');
          }}
        >
          <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
          {isAuthenticated && unread > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unread, 9)}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable Menu */}
      <Animated.View style={[styles.menuContainer, containerStyle]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={s(120) + s(12)}
        >
          {visibleServices.map((service, index) => {
            const isSelected = selected?.id === service.id;
            const imgSource = typeof service?.image === 'string' && service.image.length > 0 ? { uri: service.image } : AppIcon;

            return (
              <Animated.View
                key={service.id}
                entering={FadeInDown.delay(index * 50).springify()}
                onLayout={(e) => { positionsRef.current[service.id] = e.nativeEvent.layout; }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    selectService(service);
                    scrollToId(service.id);
                  }}
                  style={[
                    styles.serviceItem,
                    isSelected && styles.serviceItemActive
                  ]}
                >
                  <View style={[styles.iconContainer, isSelected && styles.iconContainerActive]}>
                    <Image source={imgSource} style={styles.serviceImage} resizeMode="contain" />
                  </View>
                  <Text
                    style={[styles.serviceLabel, isSelected && styles.serviceLabelActive]}
                  >
                    {service.title}
                  </Text>
                  {isSelected && <View style={styles.activeDot} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(20),
    paddingVertical: vs(12),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: ms(8),
    elevation: 3,
  },
  menuToggleBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: fs(24),
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  brandHighlight: {
    color: '#f4a119',
  },
  notificationButton: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(4),
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: fs(10), fontWeight: '800' },
  menuContainer: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: ms(20),
    elevation: 10,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingVertical: vs(16),
    alignItems: 'center',
  },
  serviceItem: {
    width: s(120),
    height: vs(82),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: ms(16),
    marginRight: s(12),
    paddingHorizontal: s(8),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  serviceItemActive: {
    backgroundColor: '#fff9f0',
    borderColor: '#f4a119',
    transform: [{ scale: 1.02 }], // Subtle scale up
  },
  iconContainer: {
    width: s(40),
    height: s(40),
    borderRadius: ms(12),
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(8),
  },
  iconContainerActive: {
    backgroundColor: '#f4a119',
  },
  serviceImage: {
    width: s(28),
    height: s(28),
    borderRadius: ms(8),
  },
  serviceLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    color: '#6c757d',
    flex: 1,
    flexWrap: 'wrap',
  },
  serviceLabelActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    top: s(6),
    right: s(6),
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: '#f4a119',
  },
});
