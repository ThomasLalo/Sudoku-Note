import { expect, test } from '@playwright/test';

const mobileViewports = [
	{ name: 'compact-mobile', width: 360, height: 640 },
	{ name: 'typical-mobile', width: 390, height: 844 },
	{ name: 'large-mobile', width: 430, height: 932 }
] as const;

for (const viewport of mobileViewports) {
	test(`${viewport.name} preview (${viewport.width}x${viewport.height})`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width: viewport.width, height: viewport.height });
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
		await page.waitForLoadState('networkidle');

		const cells = page.locator('.sudoku-cell');
		for (const [cellIndex, value] of [
			[30, '2'],
			[40, '9'],
			[50, '1']
		] as const) {
			await cells.nth(cellIndex).click();
			await page.locator('.keypad label[title="Enter digit"]').click();
			await page.keyboard.press(value);
		}

		await expect(page.locator('.value')).toHaveCount(3);

		const screenshotPath = testInfo.outputPath(`${viewport.name}.png`);
		await page.screenshot({ path: screenshotPath });
		await testInfo.attach(viewport.name, {
			path: screenshotPath,
			contentType: 'image/png'
		});
	});
}
