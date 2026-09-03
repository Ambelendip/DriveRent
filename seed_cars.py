import boto3

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CarRentalCars')

sample_cars = [
    {
        "carId": "car-001",
        "make": "Tesla",
        "model": "Model 3",
        "year": 2024,
        "dailyRate": 85,
        "isAvailable": True
    },
    {
        "carId": "car-002",
        "make": "Toyota",
        "model": "RAV4",
        "year": 2023,
        "dailyRate": 60,
        "isAvailable": True
    },
    {
        "carId": "car-003",
        "make": "BMW",
        "model": "4 Series Convertible",
        "year": 2024,
        "dailyRate": 110,
        "isAvailable": True
    }
]

print("Seeding CarRentalCars table...")
for car in sample_cars:
    table.put_item(Item=car)
    print(f"Added: {car['year']} {car['make']} {car['model']}")

print("Seeding complete! Refresh your browser at http://localhost:5173/")