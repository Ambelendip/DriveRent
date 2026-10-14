import boto3

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table("CarRentalCars")

sample_cars = [
    {
        "carId": "car-001",
        "brand": "Tesla",
        "make": "Tesla",
        "model": "Model 3 Long Range",
        "year": 2024,
        "type": "SEDAN",
        "transmission": "AUTOMATIC",
        "fuelType": "ELECTRIC",
        "seats": 5,
        "pricePerDay": 55000,
        "dailyRate": 55000,
        "location": "Douala - Akwa",
        "description": "All-electric premium sedan with autopilot, glass roof, and instant acceleration.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    {
        "carId": "car-002",
        "brand": "Toyota",
        "make": "Toyota",
        "model": "RAV4 Adventure",
        "year": 2023,
        "type": "SUV",
        "transmission": "AUTOMATIC",
        "fuelType": "PETROL",
        "seats": 5,
        "pricePerDay": 40000,
        "dailyRate": 40000,
        "location": "Yaoundé - Bastos",
        "description": "Rugged all-wheel drive SUV ideal for both city commuting and road trips.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    {
        "carId": "car-003",
        "brand": "BMW",
        "make": "BMW",
        "model": "4 Series Convertible",
        "year": 2024,
        "type": "SEDAN",
        "transmission": "AUTOMATIC",
        "fuelType": "PETROL",
        "seats": 4,
        "pricePerDay": 75000,
        "dailyRate": 75000,
        "location": "Douala - Bonanjo",
        "description": "Luxurious open-top cruiser with sporty dynamics and state-of-the-art tech.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    {
        "carId": "car-004",
        "brand": "Mercedes-Benz",
        "make": "Mercedes-Benz",
        "model": "GLE 450 4MATIC",
        "year": 2024,
        "type": "SUV",
        "transmission": "AUTOMATIC",
        "fuelType": "PETROL",
        "seats": 7,
        "pricePerDay": 90000,
        "dailyRate": 90000,
        "location": "Douala - Airport",
        "description": "Full-size executive luxury SUV featuring plush leather interior and 7 seats.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    {
        "carId": "car-005",
        "brand": "Volkswagen",
        "make": "Volkswagen",
        "model": "Golf 8 R-Line",
        "year": 2023,
        "type": "HATCHBACK",
        "transmission": "AUTOMATIC",
        "fuelType": "PETROL",
        "seats": 5,
        "pricePerDay": 30000,
        "dailyRate": 30000,
        "location": "Kribi Beach",
        "description": "Compact, fuel-efficient hatchback with sporty handling and great maneuverability.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    {
        "carId": "car-006",
        "brand": "Toyota",
        "make": "Toyota",
        "model": "HiAce Commuter Van",
        "year": 2023,
        "type": "VAN",
        "transmission": "MANUAL",
        "fuelType": "DIESEL",
        "seats": 12,
        "pricePerDay": 60000,
        "dailyRate": 60000,
        "location": "Yaoundé - Airport",
        "description": "Spacious and durable 12-passenger van for group trips, events, and family outings.",
        "available": True,
        "isAvailable": True,
        "imageUrls": [
            "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80",
        ],
    },
]

if __name__ == "__main__":
    print("Seeding CarRentalCars table...")
    for car in sample_cars:
        try:
            table.put_item(Item=car)
            print(f"Added: {car['year']} {car['brand']} {car['model']} ({car['type']})")
        except Exception as e:
            print(f"Could not insert {car['model']}: {e}")

    print("\nSeeding complete! Available vehicles are ready to view in DriveRent.")