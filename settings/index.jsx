function mySettings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">Legg til ruter-favoritter</Text>}>
        <Section title="Nytt stopp">
          <TextInput label="Navn" settingsKey="stopName"/>
          <TextInput label="ID" settingsKey="stopId" type="number" />
          <TextInput label="Retning" settingsKey="direction"/>
        </Section>
        <AdditiveList
          settingsKey="stops"
          label="Legg til stopp"
          addAction={
            <TextInput label="Legg til testast" placeholder={props.settings.stopName} disabled={true} />
          }
        />
      </Section>
    </Page>
  );
}

registerSettingsPage(mySettings);
