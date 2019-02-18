import React from "react";
import Mapping from "../../../services/Mapping";
import Card from "../components/JocondeCard";
import AdvancedSearch from "./AdvancedSearch";

export default class Joconde extends React.Component {
  render() {
    return (
      <AdvancedSearch
        collection="joconde"
        basename="Collections des musées de France (Joconde)"
        mapping={Mapping.joconde}
        displayLabel={true}
        autocomplete={true}
        onData={data => <Card key={data.REF} data={data} />}
      />
    );
  }
}
