import TabsPill from "../components/ui/tabs";

export default function Demo() {
  const tabs = [
    { label: "Mi Agenda", notification: 2 },
    { label: "Mis Empleados" },
    { label: "Mis Horarios" },
  ];

  return (
    <div className="flex justify-center mt-10">
      <TabsPill tabs={tabs} />
    </div>
  );
}
