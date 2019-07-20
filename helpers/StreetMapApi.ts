import querystring from 'query-string';

export default class StreetMapApi {
    lastBoundingBox: number[] = [];
    streetsCache: number[][] = [];

    public async getStreetsCloseToLocation(latitude: number, longitude: number) {
        const radiusInMeters = 200;
        const sideOffsetFromCenter = 360 * radiusInMeters / 40075000;

        if(this.lastBoundingBox.length > 0 && latitude >= this.lastBoundingBox[0] && latitude <= this.lastBoundingBox[2] && longitude >= this.lastBoundingBox[1] && longitude <= this.lastBoundingBox[3]){
            console.log('cache hit!')

            return this.streetsCache;
        }

        console.log('request send!');
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

    public async getPointsOfClosestStreetOnTheLeft(latitude: number, longitude: number): Promise<any[]> {
        const streetsCloseToLocation = await this.getStreetsCloseToLocation(latitude, longitude);

        const streetsOnTheLeftSide = streetsCloseToLocation.filter((pointsInStreet: any[])=> {
            const endPoint = pointsInStreet.sort((a: any, b: any) => a.lon - b.lon)[0];

            return endPoint.lon < longitude;
        });

        return streetsOnTheLeftSide.length > 0 ? streetsOnTheLeftSide[0] : [];
    }
}