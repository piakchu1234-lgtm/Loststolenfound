import { useState, useEffect } from 'react'
import { MapPin, Clock, Shield, Star, Navigation } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type SafeLocation,
  findNearestLocations,
  formatDistance,
  getLocationTypeInfo,
  getFacilityInfo,
  getSafetyScoreColor,
} from '@/lib/safe-locations'

interface SafeLocationPickerProps {
  userLocation?: { lat: number; lng: number }
  onSelect?: (location: SafeLocation) => void
  selectedLocationId?: string
}

export function SafeLocationPicker({
  userLocation,
  onSelect,
  selectedLocationId,
}: SafeLocationPickerProps) {
  const [locations, setLocations] = useState<SafeLocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLocations()
  }, [userLocation])

  async function fetchLocations() {
    setLoading(true)

    try {
      if (userLocation) {
        const nearest = await findNearestLocations(
          userLocation.lat,
          userLocation.lng,
          10,
          15
        )
        setLocations(nearest)
      }
    } catch (err) {
      console.error('[SafeLocationPicker] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No safe locations found nearby</p>
      </div>
    )
  }

  // Group by priority
  const policeStations = locations.filter((l) => l.type === 'police_station')
  const shoppingCenters = locations.filter((l) => l.type === 'shopping_center')
  const others = locations.filter(
    (l) => l.type !== 'police_station' && l.type !== 'shopping_center'
  )

  return (
    <div className="space-y-4">
      {/* Police Stations - Highest Priority */}
      {policeStations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Police Stations (Safest)
          </h3>
          <div className="space-y-2">
            {policeStations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onSelect={onSelect}
                isSelected={selectedLocationId === location.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Shopping Centers */}
      {shoppingCenters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Shopping Centres
          </h3>
          <div className="space-y-2">
            {shoppingCenters.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onSelect={onSelect}
                isSelected={selectedLocationId === location.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Locations */}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Other Safe Locations
          </h3>
          <div className="space-y-2">
            {others.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onSelect={onSelect}
                isSelected={selectedLocationId === location.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface LocationCardProps {
  location: SafeLocation
  onSelect?: (location: SafeLocation) => void
  isSelected?: boolean
}

function LocationCard({ location, onSelect, isSelected }: LocationCardProps) {
  const typeInfo = getLocationTypeInfo(location.type)
  const safetyInfo = location.safety_score
    ? getSafetyScoreColor(location.safety_score)
    : null

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onSelect?.(location)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${typeInfo.bgColor}`}
          >
            {typeInfo.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Type */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {location.name}
              </h4>
              {location.distance_km !== undefined && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {formatDistance(location.distance_km)}
                </Badge>
              )}
            </div>

            {/* Address */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location.address}
            </p>

            {/* Hours */}
            {location.hours && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {location.hours}
              </p>
            )}

            {/* Safety Score */}
            {safetyInfo && (
              <div className="flex items-center gap-1 mb-2">
                <Shield className={`h-3 w-3 ${safetyInfo.color}`} />
                <span className={`text-xs font-medium ${safetyInfo.color}`}>
                  {safetyInfo.label}
                </span>
              </div>
            )}

            {/* Facilities */}
            {location.facilities && location.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {location.facilities.slice(0, 4).map((facility) => {
                  const facilityInfo = getFacilityInfo(facility)
                  return (
                    <span
                      key={facility}
                      className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                      title={facilityInfo.label}
                    >
                      {facilityInfo.icon}
                    </span>
                  )
                })}
                {location.facilities.length > 4 && (
                  <span className="text-xs text-gray-500">
                    +{location.facilities.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Selected as meeting location
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export LocationCard for use in other components
export { LocationCard }
