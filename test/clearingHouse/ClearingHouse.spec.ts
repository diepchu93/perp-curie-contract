import { MockContract } from "@eth-optimism/smock"
import { BigNumber } from "@ethersproject/bignumber"
import { expect } from "chai"
import { waffle } from "hardhat"
import { ClearingHouse } from "../../typechain"
import { LONGER_THAN, mockedClearingHouseFixture, mockedTokenTo, SHORTER_THAN } from "./fixtures"

describe("ClearingHouse Spec", () => {
    const [wallet] = waffle.provider.getWallets()
    const loadFixture: ReturnType<typeof waffle.createFixtureLoader> = waffle.createFixtureLoader([wallet])
    const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000"
    const POOL_A_ADDRESS = "0x000000000000000000000000000000000000000A"
    const POOL_B_ADDRESS = "0x000000000000000000000000000000000000000b"
    const DEFAULT_FEE = 3000

    let clearingHouse: ClearingHouse
    let baseToken: MockContract
    let quoteToken: MockContract
    let uniV3Factory: MockContract

    beforeEach(async () => {
        const _clearingHouseFixture = await loadFixture(mockedClearingHouseFixture)
        clearingHouse = _clearingHouseFixture.clearingHouse
        baseToken = _clearingHouseFixture.mockedBaseToken
        quoteToken = _clearingHouseFixture.mockedVUSDC
        uniV3Factory = _clearingHouseFixture.mockedUniV3Factory

        // uniV3Factory.getPool always returns POOL_A_ADDRESS
        uniV3Factory.smocked.getPool.will.return.with((token0: string, token1: string, feeRatio: BigNumber) => {
            return POOL_A_ADDRESS
        })
    })

    describe("# addPool", () => {
        // @SAMPLE - addPool
        it("add a UniswapV3 pool and send an event", async () => {
            // check event has been sent
            await expect(clearingHouse.addPool(baseToken.address, DEFAULT_FEE))
                .to.emit(clearingHouse, "PoolAdded")
                .withArgs(baseToken.address, DEFAULT_FEE, POOL_A_ADDRESS)

            const pool = await clearingHouse.getPool(baseToken.address)
            expect(pool).to.eq(POOL_A_ADDRESS)
        })

        it("add multiple UniswapV3 pools", async () => {
            const baseToken2 = await mockedTokenTo(SHORTER_THAN, quoteToken.address)
            await clearingHouse.addPool(baseToken.address, DEFAULT_FEE)

            // mock the return address of `getPool`
            uniV3Factory.smocked.getPool.will.return.with(() => {
                return POOL_B_ADDRESS
            })
            await clearingHouse.addPool(baseToken2.address, DEFAULT_FEE)

            // verify isPoolExisted
            const pool = await clearingHouse.getPool(baseToken.address)
            expect(pool).to.eq(POOL_A_ADDRESS)
            const pool2 = await clearingHouse.getPool(baseToken2.address)
            expect(pool2).to.eq(POOL_B_ADDRESS)
        })

        it("force error, pool is not existent in uniswap v3", async () => {
            uniV3Factory.smocked.getPool.will.return.with(() => {
                return EMPTY_ADDRESS
            })
            await expect(clearingHouse.addPool(baseToken.address, DEFAULT_FEE)).to.be.revertedWith("CH_NEP")
        })

        it("force error, pool is existent in ClearingHouse", async () => {
            await clearingHouse.addPool(baseToken.address, DEFAULT_FEE)
            await expect(clearingHouse.addPool(baseToken.address, DEFAULT_FEE)).to.be.revertedWith("CH_EP")
        })

        it("force error, base must be smaller than quote to force base = token0 and quote = token1", async () => {
            const tokenWithLongerAddr = await mockedTokenTo(LONGER_THAN, quoteToken.address)
            await expect(clearingHouse.addPool(tokenWithLongerAddr.address, DEFAULT_FEE)).to.be.revertedWith("CH_IB")
        })
    })
})
