import React from "react";
import Mapping from "../../../services/Mapping";
import Card from "../components/MerimeeCard";
import AdvancedSearch from "./AdvancedSearch";

export default class Merimee extends React.Component {
  render() {
    return (
      <AdvancedSearch
        collection="merimee"
        basename="Patrimoine architectural (Mérimée)"
        mapping={Mapping.merimee}
        onData={data => <Card key={data.REF} data={data} />}
      />
    );
  }
}
