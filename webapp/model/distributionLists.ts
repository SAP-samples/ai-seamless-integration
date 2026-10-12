interface DistributionList {
	group: string;
	members: string[];
}

/**
 * Mock distribution-list data used by the "To:" AI input. Entering a group name
 * resolves to this list and creates one recipient token per member.
 *
 * Replace this with an actual service/API call when wiring up a real backend.
 */
const distributionLists: DistributionList[] = [
	{
		group: "DL Sofia Balkan",
		members: [
			"diana.mihaylova@sap.com",
			"ivan.petrov@sap.com",
			"maria.georgieva@sap.com",
			"nikolay.dimitrov@sap.com",
		],
	},
	{
		group: "DL Marketing Sector SAP",
		members: [
			"anna.schmidt@sap.com",
			"thomas.keller@sap.com",
			"laura.rossi@sap.com",
		],
	},
	{
		group: "DL Product Engineering",
		members: [
			"michael.adams@sap.com",
			"sara.cohen@sap.com",
			"wei.zhang@sap.com",
			"olivia.brown@sap.com",
			"james.wilson@sap.com",
		],
	},
];

export { DistributionList };
export default distributionLists;
