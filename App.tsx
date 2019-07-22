import React from 'react';
import {StyleSheet, Text, View, Alert, TouchableOpacity} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, {Camera, Circle, Marker, Polygon, Polyline, UrlTile} from "react-native-maps";
import StreetMapApi from "./helpers/StreetMapApi";
import {Coordinate} from "./models/Coordinate";
import GeoHelper from "./helpers/GeoHelper";

interface Props {
    latitude: number,
    longitude: number
}

interface State {
    position: { latitude: number, longitude: number },
    isFreeMovement: boolean,
    streets: any[][],
    pointsOfClosestStreetOnTheLeft: {lat: number, lon: number}[],
    pointsOfCurrentStreet: {lat: number, lon: number}[],
}

export default class GeolocationExample extends React.Component<Props, State> {
    state = {
        position: {latitude: 52.1442625, longitude: 6.2265799},
        isFreeMovement: false,
        streets: [],
        pointsOfClosestStreetOnTheLeft: [],
        pointsOfCurrentStreet: []
    };

    watchID: number = 0;
    map: MapView | null = null;

    async componentDidMount() {

        Geolocation.getCurrentPosition(async position => {
                await this.setCurrentPosition(position.coords.latitude, position.coords.longitude, true);
            },
            error => Alert.alert('Error', JSON.stringify(error)),
            {enableHighAccuracy: true, timeout: 20000, maximumAge: 1, distanceFilter: 0},
        );
        this.watchID = Geolocation.watchPosition(async position => {
            const {isFreeMovement} = this.state;
            await this.setCurrentPosition(position.coords.latitude, position.coords.longitude, !isFreeMovement);
        }, undefined, {maximumAge: 0, distanceFilter: 0});
    }

    async setCurrentPosition(latitude: number, longitude: number, updateCamera: boolean): Promise<void> {
        const streetMapApi = new StreetMapApi();

        const pointsOfCurrentStreet = await streetMapApi.getCurrentStreet(latitude, longitude);
        const pointsOfClosestStreetOnTheLeft = await streetMapApi.getPointsOfClosestStreetOnTheLeft(latitude, longitude, pointsOfCurrentStreet);

        this.setState({pointsOfClosestStreetOnTheLeft, pointsOfCurrentStreet, position: {latitude, longitude}});

        if (!updateCamera || this.map === null) {
            return;
        }

        const camera = await this.map.getCamera();
        camera.center.longitude = longitude;
        camera.center.latitude = latitude;


        this.map.animateCamera(camera, {duration: 300});
    }

    enableFreeMove = () => this.setState({isFreeMovement: true});

    disableFreeMove = async () => {
        const {position} = this.state
        await this.setCurrentPosition(position.latitude, position.longitude, true);

        this.setState({isFreeMovement: false});
    };

    componentWillUnmount() {
        this.watchID != null && Geolocation.clearWatch(this.watchID);
    }

    render() {
        const {position, isFreeMovement, pointsOfCurrentStreet, pointsOfClosestStreetOnTheLeft} = this.state;

        const colors = ['Chocolate', 'BlueViolet', 'Cyan', 'Indigo', 'Navy', 'Orange', 'Salmon', 'SteelBlue', 'Thistle', 'WhiteSmoke', 'SpringGreen'];

        const roadStart: Coordinate | undefined = pointsOfClosestStreetOnTheLeft.length > 0 ? pointsOfClosestStreetOnTheLeft[pointsOfClosestStreetOnTheLeft.length -1] : undefined;
        const roadEnd = GeoHelper.getNodeClosestToDistance(pointsOfClosestStreetOnTheLeft, 20);

        return (
            <View style={styles.container}>
                <MapView
                    ref={ref => {
                        this.map = ref;
                    }}
                    style={styles.container}
                    initialRegion={{
                        latitude: 52.1442625,
                        longitude: 6.2265799,
                        latitudeDelta: 0.002,
                        longitudeDelta: 0.002,
                    }}
                    onTouchStart={this.enableFreeMove}
                >
                    <UrlTile urlTemplate={'http://c.tile.openstreetmap.org/{z}/{x}/{y}.png'}/>

                    <Marker
                        coordinate={{longitude: position.longitude, latitude: position.latitude}}
                        title={"long:" + position.longitude + " lat: " + position.latitude}
                        pinColor={'cyan'}
                    />


                    {pointsOfClosestStreetOnTheLeft.map((pos: any, index: number) => {
                        return <Marker
                            key={pos.id}
                            coordinate={{longitude: pos.lon, latitude: pos.lat}}
                            title={"long:" + pos.lon + " lat: " + pos.lat}
                            pinColor={'red'}
                        />
                    })}

                    {pointsOfCurrentStreet.map((pos: any, index: number) => {
                        return <Marker
                            key={pos.id}
                            coordinate={{longitude: pos.lon, latitude: pos.lat}}
                            title={"long:" + pos.lon + " lat: " + pos.lat}
                            pinColor={'purple'}
                        />
                    })}

                    {roadEnd !== undefined && <Polygon fillColor='rgba(160,174,192, 0.4)' coordinates={[position, {longitude: roadStart!.lon, latitude: roadStart!.lat}, {longitude: roadEnd!.lon, latitude: roadEnd!.lat}]} />}
                    {roadEnd !== undefined &&
                    <Polyline coordinates={[position, {longitude: roadEnd!.lon, latitude: roadEnd!.lat}]}/>}
                </MapView>
                {isFreeMovement && <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={this.disableFreeMove}
                        style={[styles.bubble, styles.button]}
                    >
                        <Text>Follow</Text>
                    </TouchableOpacity>
                </View>}

            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'flex-end',
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'red',
        alignItems: 'center',
    },
    title: {
        fontWeight: '500',
    },
    bubble: {
        flex: 1,
        backgroundColor: 'white',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 20,
    },
    button: {
        width: 50,
        paddingHorizontal: 12,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginVertical: 20,
        backgroundColor: 'transparent',
    },
});