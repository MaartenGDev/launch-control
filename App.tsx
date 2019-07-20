import React from 'react';
import {StyleSheet, Text, View, Alert, TouchableOpacity} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, {Camera, Circle, Polyline, UrlTile} from "react-native-maps";
import StreetMapApi from "./helpers/StreetMapApi";

interface Props {
    latitude: number,
    longitude: number
}

interface State {
    position: { latitude: number, longitude: number },
    isFreeMovement: boolean,
    streets: any[][],
    pointsOfClosestStreetOnTheLeft: any[],
}

export default class GeolocationExample extends React.Component<Props, State> {
    state = {
        position: {latitude: 52.1442625, longitude: 6.2265799},
        isFreeMovement: false,
        streets: [],
        pointsOfClosestStreetOnTheLeft: [],
    };

    watchID: number = 0;
    map: MapView | null = null;

    async componentDidMount() {
        const streetMapApi = new StreetMapApi();

        Geolocation.getCurrentPosition(async position => {
                await this.setCurrentPosition(position.coords.latitude, position.coords.longitude, true);


            },
            error => Alert.alert('Error', JSON.stringify(error)),
            {enableHighAccuracy: true, timeout: 20000, maximumAge: 1, distanceFilter: 0},
        );
        this.watchID = Geolocation.watchPosition(async position => {
            const {isFreeMovement} = this.state;
            await this.setCurrentPosition(position.coords.latitude, position.coords.longitude, !isFreeMovement);

            const pointsOfClosestStreetOnTheLeft = await streetMapApi.getPointsOfClosestStreetOnTheLeft(position.coords.latitude, position.coords.longitude);
            this.setState({pointsOfClosestStreetOnTheLeft});
        }, undefined, {maximumAge: 0, distanceFilter: 0});


    }

    async setCurrentPosition(latitude: number, longitude: number, updateCamera: boolean): Promise<void> {
        this.setState({position: {latitude, longitude}});

        if (!updateCamera || this.map === null) {
            return;
        }

        const camera = await this.map.getCamera();
        camera.center.longitude = longitude;
        camera.center.latitude = latitude;


        this.map.setCamera(camera);
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
        const {position, isFreeMovement, streets, pointsOfClosestStreetOnTheLeft} = this.state;



        const roadStart: any | null = pointsOfClosestStreetOnTheLeft.length > 0 ? pointsOfClosestStreetOnTheLeft[0] : null;

        return (
            <View style={styles.container}>
                <MapView
                    ref={ref => {
                        this.map = ref;
                    }}
                    showsUserLocation={true}
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
                    <Circle center={{longitude: position.longitude, latitude: position.latitude}} radius={1} fillColor='red'
                            strokeColor='red'/>

                    {pointsOfClosestStreetOnTheLeft.map((point: any) => {
                        return <Circle center={{longitude: point.lon, latitude: point.lat}} radius={1} fillColor='indigo'/>
                    })}
                    
                    {roadStart !== null && <Polyline coordinates={[position, {longitude: roadStart.lon, latitude: roadStart.lat}]} />}
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