import {Coordinate} from "../models/Coordinate";

export default class GeoHelper {
    static distance(firstCoordinate: Coordinate, secondCoordinate: Coordinate): number{
        const R = 6371e3; // metres
        const var1 = GeoHelper.toRadians(firstCoordinate.lat);
        const var2 = GeoHelper.toRadians(secondCoordinate.lat);
        const var3 = GeoHelper.toRadians(secondCoordinate.lat - firstCoordinate.lat);
        const var4 = GeoHelper.toRadians(secondCoordinate.lon - firstCoordinate.lon);


        const a = Math.sin(var3 / 2) * Math.sin(var3 / 2) +
            Math.cos(var1) * Math.cos(var2) *
            Math.sin(var4 / 2) * Math.sin(var4 / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    static toRadians(number: number){
        return number * Math.PI / 180;
    }

    static getNodeClosestToDistance(coordinates: Coordinate[], distanceInMeters: number): Coordinate | undefined {
        if(coordinates.length === 0) return undefined;

        if(coordinates.length < 2) return coordinates[0];

        const startNode = coordinates[0];
        let totalDistance = 0;


        let index = 1;

        for (const coordinate of coordinates.slice(1)) {
            const distance = GeoHelper.distance(startNode, coordinate);

            if(totalDistance + distance > distanceInMeters){
                return coordinates[index - 1];
            }

            index++;
        }

        return coordinates[0];

    }
}