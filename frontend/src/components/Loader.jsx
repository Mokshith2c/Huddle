import {Bouncy} from "ldrs/react";
import {Quantum} from "ldrs/react";
import {JellyTriangle} from "ldrs/react";
import {Metronome} from "ldrs/react";
import {Hourglass} from "ldrs/react";
import { Ring } from 'ldrs/react'
import 'ldrs/react/Ring.css'


import "ldrs/react/Bouncy.css";
import "ldrs/react/Quantum.css";
import "ldrs/react/JellyTriangle.css";
import "ldrs/react/Metronome.css";
import "ldrs/react/Hourglass.css";

export default function Loader({type = "bouncy", size="25", color="black", speed="1.75"}){
    switch(type){
        case "bouncy":
            return(
                <Bouncy size={size} speed={speed} color={color}/>
            )
        case "quantum":
            return(
                <Quantum size={size} speed={speed} color={color}/>
            )
        case "jellytriangle":
            return(
                <JellyTriangle size={size} speed={speed} color={color}/>
            )
        case "metronome":
            return(
                <Metronome size={size} speed={speed} color={color}/>
            )
        case "hourglass":
            return(
                <Hourglass size={size} speed={speed} color={color}/>
            )
        case "ring":
            return(
                <Ring size={size} speed={speed} color={color} stroke="3" />
            )
        default:
            return null;
    }
}