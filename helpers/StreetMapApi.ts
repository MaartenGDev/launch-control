import querystring from 'query-string';
import GeoHelper from "./GeoHelper";
import {Coordinate} from "../models/Coordinate";

export default class StreetMapApi {
    lastBoundingBox: number[] = [];
    streetsCache: Coordinate[][] = [];

    public async getStreetsCloseToLocation(latitude: number, longitude: number): Promise<Coordinate[][]> {
        const radiusInMeters = 600;
        const sideOffsetFromCenter = 360 * radiusInMeters / 40075000;

        if (this.lastBoundingBox.length > 0 && latitude >= this.lastBoundingBox[0] && latitude <= this.lastBoundingBox[2] && longitude >= this.lastBoundingBox[1] && longitude <= this.lastBoundingBox[3]) {
            return this.streetsCache;
        }

        const boundingBox = [
            latitude - sideOffsetFromCenter, //x1
            longitude - sideOffsetFromCenter, //y1
            latitude + sideOffsetFromCenter, //x2
            longitude + sideOffsetFromCenter,//y2
        ];

        this.lastBoundingBox = boundingBox;

        const query = `[out:json][timeout:25];
(
  way["highway"](${boundingBox[0]},${boundingBox[1]},${boundingBox[2]},${boundingBox[3]});
);
out body;
>;
out skel qt;
        `;

        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify({data: query})
        };

        let response: any = await (await fetch('http://overpass-api.de/api/interpreter', options)).json();

        const nodesById = response.elements.filter((elem: any) => elem.type === 'node').reduce((acc: any, cur: any) => ({
            ...acc,
            [cur.id]: cur
        }), {});

        return this.streetsCache = response.elements.map((elem: any) => {
            if (elem.type !== 'way') return [];

            const list = Object.keys(nodesById).map(key => nodesById[key]);
            return list.filter(x => {
                return elem.nodes.indexOf(x.id) !== -1
            });
        }).filter((x: any) => x.length > 0);
    }

    public async getPointsOfClosestStreetOnTheLeft(latitude: number, longitude: number, pointsOfCurrentStreet: Coordinate[]): Promise<Coordinate[]> {
        const streetsCloseToLocation = await this.getStreetsCloseToLocation(latitude, longitude);

        const streetsOnTheLeftSide = streetsCloseToLocation.filter((pointsInStreet) => {
            // get lowest lat
            const endPoint = pointsInStreet.sort((a, b) => b.lat - a.lat)[0];

            // If the street doesn't connect to the current street, ignore
            if (!pointsOfCurrentStreet.some(x => pointsInStreet.some(pointOfStreet => pointOfStreet.lon === x.lon && pointOfStreet.lat === x.lat))) {
                return false;
            }

            return endPoint.lat > latitude && endPoint.lon > longitude;
        });

        return streetsOnTheLeftSide.length > 0 ? streetsOnTheLeftSide.sort((a, b) => {
            return a[0].lat - b[0].lat
        })[0] : [];
    }


    public async getCurrentStreet(latitude: number, longitude: number): Promise<Coordinate[]> {
        const streetsCloseToLocation = await this.getStreetsCloseToLocation(latitude, longitude);

        let closestDistance = undefined;
        let closestPointsInStreet: Coordinate[] = [];

        for (const pointsInStreet of streetsCloseToLocation) {
            const furthestPoint = pointsInStreet.sort((a, b) => b.lat - a.lat)[0];
            const lowestPoint = pointsInStreet.sort((a, b) => b.lat - a.lat)[pointsInStreet.length - 1];

            const curve = (furthestPoint.lon - lowestPoint.lon) / (furthestPoint.lat - lowestPoint.lat)

            // street doesn't stop or starts after the provided location
            if (lowestPoint.lat > latitude || furthestPoint.lat < latitude) {
                continue;
            }

            const difference = latitude - lowestPoint.lat;

            const newLat: number = latitude;
            const newLong: number = lowestPoint.lon + (difference * curve);

            const distance = GeoHelper.distance({lat: latitude, lon: longitude}, {lat: newLat, lon: newLong});

            if (closestDistance === undefined || closestDistance > distance) {
                closestDistance = distance;
                closestPointsInStreet = pointsInStreet;
            }
        }


        return closestPointsInStreet;
    }
}