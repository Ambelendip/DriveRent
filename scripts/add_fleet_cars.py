"""Add 15 extra public fleet listings without replacing existing cars."""

from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

REGION = "us-east-1"
TABLE_NAME = "CarRentalCars"

VEHICLES = [
    ("Toyota", "Corolla Cross", 2023, "SUV", "AUTOMATIC", "PETROL", 5, 42000, "Douala - Akwa", "Comfortable compact SUV for city trips and weekend drives.", "photo-1519641471654-76ce0107ad1b"),
    ("Toyota", "Prado TX-L", 2022, "SUV", "AUTOMATIC", "DIESEL", 7, 95000, "Yaounde - Bastos", "Roomy four-wheel-drive SUV suited to longer regional journeys.", "photo-1519641471654-76ce0107ad1b"),
    ("Toyota", "Camry Hybrid", 2024, "SEDAN", "AUTOMATIC", "HYBRID", 5, 65000, "Douala - Bonanjo", "Quiet executive sedan with a spacious cabin and efficient hybrid drive.", "photo-1552519507-da3b142c6e3d"),
    ("Honda", "CR-V Touring", 2023, "SUV", "AUTOMATIC", "PETROL", 5, 58000, "Buea", "Versatile family SUV with generous luggage space and comfortable seating.", "photo-1519641471654-76ce0107ad1b"),
    ("Hyundai", "Tucson Limited", 2024, "SUV", "AUTOMATIC", "PETROL", 5, 52000, "Bamenda", "Modern crossover for comfortable city and highland travel.", "photo-1519641471654-76ce0107ad1b"),
    ("Kia", "Sportage EX", 2023, "SUV", "AUTOMATIC", "PETROL", 5, 48000, "Bafoussam", "Practical crossover with a comfortable interior for daily hire.", "photo-1519641471654-76ce0107ad1b"),
    ("Nissan", "X-Trail Tekna", 2022, "SUV", "AUTOMATIC", "PETROL", 7, 56000, "Garoua", "Seven-seat SUV with flexible space for families and small groups.", "photo-1519641471654-76ce0107ad1b"),
    ("Mitsubishi", "Pajero Sport", 2021, "SUV", "AUTOMATIC", "DIESEL", 7, 78000, "Maroua", "Robust seven-seat SUV for longer trips and changing road conditions.", "photo-1519641471654-76ce0107ad1b"),
    ("Suzuki", "Swift GLX", 2023, "HATCHBACK", "AUTOMATIC", "PETROL", 5, 26000, "Ebolowa", "Easy-to-drive compact hatchback for efficient city errands.", "photo-1541899481282-d53bffe3c35d"),
    ("Hyundai", "Accent GLS", 2022, "SEDAN", "AUTOMATIC", "PETROL", 5, 28000, "Bertoua", "Simple, comfortable sedan for business and everyday journeys.", "photo-1552519507-da3b142c6e3d"),
    ("Mercedes-Benz", "E-Class E300", 2022, "SEDAN", "AUTOMATIC", "PETROL", 5, 88000, "Yaounde - Centre", "Executive sedan with a refined cabin for business and airport travel.", "photo-1563720223185-11003d516935"),
    ("Lexus", "RX 350", 2023, "SUV", "AUTOMATIC", "PETROL", 5, 105000, "Douala - Airport", "Premium SUV offering a quiet ride and generous passenger comfort.", "photo-1519641471654-76ce0107ad1b"),
    ("Ford", "Ranger XLT", 2022, "PICKUP", "AUTOMATIC", "DIESEL", 5, 72000, "Ngaoundere", "Double-cab pickup for equipment, field work and out-of-town routes.", "photo-1551830820-330a71b99659"),
    ("Toyota", "Land Cruiser 200", 2021, "SUV", "AUTOMATIC", "DIESEL", 7, 145000, "Buea - Molyko", "Full-size four-wheel-drive vehicle for demanding regional travel.", "photo-1519641471654-76ce0107ad1b"),
    ("Toyota", "Coaster Mini Coach", 2020, "VAN", "MANUAL", "DIESEL", 22, 115000, "Yaounde - Airport", "Group coach with seating for up to 22 passengers.", "photo-1570125909232-eb263c188f7e"),
]


def seed_extra_vehicles():
    table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)
    added = 0
    skipped = 0

    for index, vehicle in enumerate(VEHICLES, start=101):
        brand, model, year, kind, transmission, fuel, seats, rate, location, description, image = vehicle
        car_id = f"car-{index:03d}"
        image_url = f"https://images.unsplash.com/{image}?auto=format&fit=crop&w=1200&q=85"
        item = {
            "carId": car_id,
            "brand": brand,
            "make": brand,
            "model": model,
            "year": year,
            "type": kind,
            "transmission": transmission,
            "fuelType": fuel,
            "seats": seats,
            "pricePerDay": Decimal(rate),
            "dailyRate": Decimal(rate),
            "location": location,
            "description": description,
            "available": True,
            "isAvailable": True,
            "imageUrls": [image_url],
        }
        try:
            table.put_item(Item=item, ConditionExpression=Attr("carId").not_exists())
            added += 1
            print(f"Added {car_id}: {brand} {model}")
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            skipped += 1
            print(f"Skipped existing {car_id}: {brand} {model}")

    print(f"Complete: {added} added, {skipped} already existed.")


if __name__ == "__main__":
    seed_extra_vehicles()
