import React from "react";
import MapView from 'react-native-maps';
import {View, StyleSheet} from 'react-native';
import IRegion from "./models/IRegion";

export interface Props {
    region: IRegion,
    onRegionChangeComplete: (region: IRegion) => void
}


export const Map: React.FunctionComponent<Props> = ({region, }) => {
    return
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
});