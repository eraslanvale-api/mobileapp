import { StyleSheet, View, } from 'react-native'
import { Colors } from '../../constants/Colors'
import { useEffect } from 'react'
import TopMenu from '../../components/TopMenu'
import MapScreen from './MapScreen'
import BottomSheetMenu from './BottomSheetMenu'
import { useJourney } from '../../context/JourneyContext'

const HomeScreen = ({ navigation, route }) => {
  const { sheetSnapFn, setSheetMode } = useJourney()

  useEffect(() => {
    const open = route?.params?.openServices
    if (open) {
      setSheetMode('services')
      setTimeout(() => {
        sheetSnapFn(1)
        navigation.setParams({ openServices: false })
      }, 0)
    }
    const fetchSettings = async () => {
      try {
/*         const response = await axios.post('https://api.eraslanvale.com.tr/api/hizmet_getir/r465veunf507xdou3q8qyjrthvuic9', {
          Link: "https://eraslanvale.com.tr"
        })
        console.log(JSON.stringify(response.data))
 */      } catch (error) {
        console.error('API Error:', error)
      }
    }
    fetchSettings()

  }, [route?.params?.openServices, sheetSnapFn, setSheetMode, navigation])

  return (
    <View style={styles.container}>
      <TopMenu />
      <MapScreen />
      <BottomSheetMenu />
    </View>
  )
}

export default HomeScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
})
