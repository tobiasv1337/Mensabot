from .scoring import OSMRef


def overpass_query_near(lat: float, lon: float, radius_m: int) -> str:
    return f"""
[out:json][timeout:25];
(
  nwr(around:{radius_m},{lat},{lon})["amenity"="canteen"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="cafe"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="food_court"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="fast_food"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="restaurant"]["cuisine"~"cafeteria|canteen",i];
  nwr(around:{radius_m},{lat},{lon})["name"~"\\bMensa\\b|Cafeteria|Canteen",i];
);
out center tags;
"""


def overpass_query_element(ref: OSMRef) -> str:
    return f"""
[out:json][timeout:25];
{ref.osm_type}(id:{ref.osm_id});
out center tags;
"""
